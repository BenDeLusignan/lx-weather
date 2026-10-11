import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

// Doesn't use the shared test database: it needs a database that stops at
// the first migration, with an account in it, before the preferences migration runs.
test("the preferences migration keeps existing accounts, ids and the id counter, and they read as the defaults", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "lx-weather-migration-"));
  const client = createClient({ url: `file:${path.join(dir, "old.db")}` });
  try {
    const full = path.join(process.cwd(), "drizzle");
    const first = path.join(dir, "first");
    cpSync(full, first, { recursive: true });
    const journalPath = path.join(first, "meta", "_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: unknown[] };
    journal.entries = journal.entries.slice(0, 1);
    writeFileSync(journalPath, JSON.stringify(journal));

    const db = drizzle(client);
    await migrate(db, { migrationsFolder: first });

    // Two accounts, then the newest one deleted: the counter must stay at 2.
    await client.execute("INSERT INTO user (email, password_hash, home_club_id) VALUES ('a@example.com', 'x', 'omagh'), ('b@example.com', 'y', 'larne')");
    await client.execute("DELETE FROM user WHERE email = 'b@example.com'");

    await migrate(db, { migrationsFolder: full });

    const rows = (await client.execute("SELECT id, email, home_club_id, password_hash, theme, days, hours FROM user")).rows;
    assert.equal(rows.length, 1);
    assert.deepEqual({ ...rows[0] }, {
      id: 1,
      email: "a@example.com",
      home_club_id: "omagh",
      password_hash: "x",
      theme: "system",
      days: 127,
      hours: 4095,
    });
    await client.execute("INSERT INTO user (email, password_hash, home_club_id) VALUES ('c@example.com', 'z', 'omagh')");
    const next = (await client.execute("SELECT id FROM user WHERE email = 'c@example.com'")).rows[0];
    assert.equal(next?.id, 3, "AUTOINCREMENT still never reuses an id");
  } finally {
    client.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
