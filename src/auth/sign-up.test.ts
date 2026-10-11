// Must be first: it sets up the test database and the session secret (see the file).
import { usersWithEmail } from "@/data/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { sql } from "drizzle-orm";
import { verifyPassword } from "@/auth/password";
import { submitSignUp } from "@/auth/submit";
import { LOGIN_FAILURE_LIMIT, PASSWORD_MIN_LENGTH } from "@/data/limits";
import { getDb } from "@/db/client";
import { user } from "@/db/schema";

const NOW = 1_700_000_000;
const IP = "198.51.100.4";
const PASSWORD = "correct-horse-battery";

function form(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("email", "player@example.com");
  formData.set("password", PASSWORD);
  formData.set("homeClub", "enniskillen");
  for (const [name, value] of Object.entries(overrides)) formData.set(name, value);
  return formData;
}

const signUp = (overrides: Record<string, string> = {}, ip: string | null = IP, now = NOW) =>
  submitSignUp(form(overrides), { now, ip });

test("sign-up creates the user with a hashed password and a normalised email, and logs them in", async () => {
  const result = await signUp({ email: "  Ann.Player@Example.COM  " });
  assert.equal(result.redirect, "/");

  const [row] = await usersWithEmail("ann.player@example.com");
  assert.ok(row, "stored lowercased and trimmed");
  assert.equal(row.homeClubId, "enniskillen");
  assert.notEqual(row.passwordHash, PASSWORD);
  assert.ok(!row.passwordHash.includes(PASSWORD));
  assert.ok(row.passwordHash.startsWith("scrypt$"));
  assert.ok(await verifyPassword(PASSWORD, row.passwordHash));
  assert.ok(!(await verifyPassword("not-the-password-0", row.passwordHash)));

  // The session to start is for this user, under this hash.
  assert.deepEqual(result.session, { id: row.id, passwordHash: row.passwordHash, theme: "system" });
});

test("a duplicate email is refused, whatever its case or spacing, with the same generic flag", async () => {
  await signUp({ email: "dup@example.com" }, "198.51.100.10");

  for (const email of ["dup@example.com", "DUP@Example.com", " dup@example.com "]) {
    const again = await signUp({ email, homeClub: "omagh", password: "another-long-password" }, "198.51.100.10");
    assert.deepEqual(again, { redirect: "/signup?error=failed" }, "no session, and nothing about the email");
  }
  const rows = await usersWithEmail("dup@example.com");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.homeClubId, "enniskillen", "the first account is untouched");
});

test("a bad email, a short password or a club not in the list creates nothing", async () => {
  const cases: [Record<string, string>, string][] = [
    [{ email: "not-an-email" }, "/signup?error=email"],
    [{ email: "a@b" }, "/signup?error=email"],
    [{ password: "x".repeat(PASSWORD_MIN_LENGTH - 1) }, "/signup?error=password"],
    [{ homeClub: "atlantis" }, "/signup?error=club"],
    [{ homeClub: "" }, "/signup?error=club"],
    [{ homeClub: "ENNISKILLEN" }, "/signup?error=club"],
  ];
  for (const [overrides, redirect] of cases) {
    const result = await signUp({ email: "invalid@example.com", ...overrides });
    assert.deepEqual(result, { redirect }, JSON.stringify(overrides));
  }
  assert.equal((await usersWithEmail("invalid@example.com")).length, 0);
  assert.equal((await usersWithEmail("not-an-email")).length, 0);
});

test("a hand-made request with missing or odd fields is refused, not crashed", async () => {
  const empty = await submitSignUp(new FormData(), { now: NOW, ip: IP });
  assert.deepEqual(empty, { redirect: "/signup?error=email" });

  const file = form();
  file.set("homeClub", new File(["x"], "x.txt"));
  assert.deepEqual(await submitSignUp(file, { now: NOW, ip: IP }), { redirect: "/signup?error=club" });
});

test("the database refuses an email that isn't normalised, and a second copy of one that is", async () => {
  const db = getDb();
  await assert.rejects(
    db.insert(user).values({ email: "Mixed@Example.com", passwordHash: "x", homeClubId: "omagh" }),
    "stored lowercase only",
  );
  await db.insert(user).values({ email: "unique@example.com", passwordHash: "x", homeClubId: "omagh" });
  await assert.rejects(
    db.insert(user).values({ email: "unique@example.com", passwordHash: "y", homeClubId: "omagh" }),
    "unique",
  );
  assert.equal(
    (await db.all<{ n: number }>(sql`select count(*) as n from "user" where email = 'unique@example.com'`))[0]?.n,
    1,
  );
});

test("repeated refused sign-ups from one address lock it, like repeated wrong passwords", async () => {
  const ip = "198.51.100.77";
  await signUp({ email: "taken@example.com" }, ip);
  let last = await signUp({ email: "taken@example.com" }, ip);
  for (let i = 1; i < LOGIN_FAILURE_LIMIT; i++) last = await signUp({ email: "taken@example.com" }, ip);
  assert.deepEqual(last, { redirect: "/signup?error=failed" });

  // The attempts are used up: the next one is refused as locked, without going near the database.
  assert.deepEqual(await signUp({ email: "taken@example.com" }, ip), { redirect: "/signup?locked=1" });
});
