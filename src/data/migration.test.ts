import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { daysFromColumns, type DayColumnKey, type DayHours } from "@/preferences/preferences";

// These don't use the shared test database: they need a database that stops at
// an earlier migration, with accounts in it, before the next migration runs.

const FULL = path.join(process.cwd(), "drizzle");

/** A copy of the migrations folder whose journal stops after the first `count` migrations. */
function migrationsUpTo(dir: string, count: number): string {
  const copy = path.join(dir, `first-${count}`);
  cpSync(FULL, copy, { recursive: true });
  const journalPath = path.join(copy, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: unknown[] };
  journal.entries = journal.entries.slice(0, count);
  writeFileSync(journalPath, JSON.stringify(journal));
  return copy;
}

async function withDatabase(run: (client: Client, dir: string) => Promise<void>) {
  const dir = mkdtempSync(path.join(tmpdir(), "lx-weather-migration-"));
  const client = createClient({ url: `file:${path.join(dir, "old.db")}` });
  try {
    await run(client, dir);
  } finally {
    client.close();
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      // Windows can still hold the closed database file for a moment (EPERM/EBUSY). A leftover
      // temp folder is harmless; it must not turn a passing test into a failing one.
      if (!["EPERM", "EBUSY"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
    }
  }
}

const DAY_IDS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** The seven days of an account as the app reads them, from its raw row (snake_case columns, as the migration made them). */
async function weekOf(client: Client, email: string): Promise<(DayHours | null)[]> {
  const { rows } = await client.execute({ sql: "SELECT * FROM user WHERE email = ?", args: [email] });
  assert.equal(rows.length, 1, email);
  const row = rows[0] as Record<string, unknown>;
  const columns = {} as Record<DayColumnKey, unknown>;
  for (const id of DAY_IDS) {
    columns[`${id}Start`] = row[`${id}_start`];
    columns[`${id}End`] = row[`${id}_end`];
  }
  return daysFromColumns(columns);
}

// Old layout: `days` bit 0 is Monday ... bit 6 Sunday; `hours` bit 0 is the 10:00 block ... bit 11 the 21:00 block.
const bits = (...positions: number[]) => positions.reduce((mask, bit) => mask | (1 << bit), 0);
const hourBits = (...hours: number[]) => bits(...hours.map((hour) => hour - 10));

test("the preferences migrations keep existing accounts, ids and the id counter, and they read as every day, 08:00 to 22:00", async () => {
  await withDatabase(async (client, dir) => {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: migrationsUpTo(dir, 1) });

    // Two accounts, then the newest one deleted: the counter must stay at 2.
    await client.execute("INSERT INTO user (email, password_hash, home_club_id) VALUES ('a@example.com', 'x', 'omagh'), ('b@example.com', 'y', 'larne')");
    await client.execute("DELETE FROM user WHERE email = 'b@example.com'");

    await migrate(db, { migrationsFolder: FULL });

    const rows = (await client.execute("SELECT id, email, home_club_id, password_hash, theme FROM user")).rows;
    assert.equal(rows.length, 1);
    assert.deepEqual({ ...rows[0] }, {
      id: 1,
      email: "a@example.com",
      home_club_id: "omagh",
      password_hash: "x",
      theme: "system",
    });
    assert.deepEqual(await weekOf(client, "a@example.com"), Array(7).fill({ start: 8, end: 21 }));
    await client.execute("INSERT INTO user (email, password_hash, home_club_id) VALUES ('c@example.com', 'z', 'omagh')");
    const next = (await client.execute("SELECT id FROM user WHERE email = 'c@example.com'")).rows[0];
    assert.equal(next?.id, 3, "AUTOINCREMENT still never reuses an id");
    assert.deepEqual(await weekOf(client, "c@example.com"), Array(7).fill({ start: 8, end: 21 }), "a new account's column defaults");
  });
});

test("per-day hours migration: a day that was on keeps the covering range of its old hours, a day that was off stays off", async () => {
  await withDatabase(async (client, dir) => {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: migrationsUpTo(dir, 2) });

    const accounts: { email: string; theme: string; days: number; hours: number }[] = [
      // The defaults (every day, every hour): they saw everything, so they get the whole new window.
      { email: "default@example.com", theme: "system", days: 127, hours: 4095 },
      // Monday and Saturday only, 18:00 to 22:00.
      { email: "evenings@example.com", theme: "dark", days: bits(0, 5), hours: hourBits(18, 19, 20, 21) },
      // Hours with gaps (10, 12, 13) become the covering range 10 to 13.
      { email: "gaps@example.com", theme: "light", days: 127, hours: hourBits(10, 12, 13) },
      // One hour on one day: a range of one block.
      { email: "single@example.com", theme: "system", days: bits(2), hours: hourBits(14) },
      // Every old hour but the last: not the default, so it keeps 10 to 20 (the window did not widen for it).
      { email: "nolast@example.com", theme: "system", days: 127, hours: hourBits(10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20) },
      // Every old hour but the first: 11 to 21.
      { email: "nofirst@example.com", theme: "system", days: bits(1, 3), hours: hourBits(11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21) },
      // The very last block only, on Sunday.
      { email: "last@example.com", theme: "system", days: bits(6), hours: hourBits(21) },
      // The very first old block only, every day.
      { email: "first@example.com", theme: "system", days: 127, hours: hourBits(10) },
    ];
    for (const a of accounts) {
      await client.execute({
        sql: "INSERT INTO user (email, password_hash, home_club_id, theme, days, hours) VALUES (?, 'h', 'omagh', ?, ?, ?)",
        args: [a.email, a.theme, a.days, a.hours],
      });
    }
    // A deleted newest row, to see the id counter survive this migration too.
    await client.execute("INSERT INTO user (email, password_hash, home_club_id) VALUES ('gone@example.com', 'h', 'omagh')");
    await client.execute("DELETE FROM user WHERE email = 'gone@example.com'");
    const before = (await client.execute("SELECT email, id FROM user ORDER BY id")).rows.map((r) => ({ ...r }));

    await migrate(db, { migrationsFolder: FULL });

    const off = null;
    const whole = { start: 8, end: 21 };
    assert.deepEqual(await weekOf(client, "default@example.com"), Array(7).fill(whole));
    assert.deepEqual(await weekOf(client, "evenings@example.com"), [{ start: 18, end: 21 }, off, off, off, off, { start: 18, end: 21 }, off]);
    assert.deepEqual(await weekOf(client, "gaps@example.com"), Array(7).fill({ start: 10, end: 13 }));
    assert.deepEqual(await weekOf(client, "single@example.com"), [off, off, { start: 14, end: 14 }, off, off, off, off]);
    assert.deepEqual(await weekOf(client, "nolast@example.com"), Array(7).fill({ start: 10, end: 20 }));
    assert.deepEqual(await weekOf(client, "nofirst@example.com"), [off, { start: 11, end: 21 }, off, { start: 11, end: 21 }, off, off, off]);
    assert.deepEqual(await weekOf(client, "last@example.com"), [off, off, off, off, off, off, { start: 21, end: 21 }]);
    assert.deepEqual(await weekOf(client, "first@example.com"), Array(7).fill({ start: 10, end: 10 }));

    // Raw columns: an off day is two NULLs, not a stored default.
    const raw = (await client.execute("SELECT * FROM user WHERE email = 'evenings@example.com'")).rows[0];
    assert.equal(raw?.tue_start, null);
    assert.equal(raw?.tue_end, null);
    assert.equal(raw?.mon_start, 18);
    assert.equal(raw?.theme, "dark", "the theme is untouched");

    // The old bitmask columns are gone, and every row and id is as it was.
    const columns = (await client.execute("PRAGMA table_info(user)")).rows.map((r) => String(r.name));
    assert.ok(!columns.includes("days") && !columns.includes("hours"), columns.join());
    assert.deepEqual((await client.execute("SELECT email, id FROM user ORDER BY id")).rows.map((r) => ({ ...r })), before);
    await client.execute("INSERT INTO user (email, password_hash, home_club_id) VALUES ('after@example.com', 'h', 'omagh')");
    const next = (await client.execute("SELECT id FROM user WHERE email = 'after@example.com'")).rows[0];
    assert.equal(next?.id, before.length + 2, "AUTOINCREMENT still never reuses an id");

    // The CHECKs came with the migration: a half-set day and an all-off week are refused.
    await assert.rejects(client.execute("UPDATE user SET mon_end = NULL WHERE email = 'after@example.com'"));
    await assert.rejects(client.execute("UPDATE user SET sat_start = 20, sat_end = 9 WHERE email = 'after@example.com'"));
    await assert.rejects(
      client.execute(
        `UPDATE user SET ${DAY_IDS.map((d) => `${d}_start = NULL, ${d}_end = NULL`).join(", ")} WHERE email = 'after@example.com'`,
      ),
    );
  });
});
