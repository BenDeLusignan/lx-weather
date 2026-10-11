// Must be first: it sets up the test database and the session secret (see the file).
import "@/data/test-database";
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { eq, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/auth/password";
import { passwordFingerprint, signSession, verifySession } from "@/auth/session";
import { submitLogin, submitPasswordChange, type SubmitResult } from "@/auth/submit";
import {
  IP_FAILURE_LIMIT,
  LOGIN_FAILURE_LIMIT,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/data/limits";
import { changePasswordHash, createUser, getUserCredentialsById, type User } from "@/data/users";
import { getDb } from "@/db/client";
import { loginAttempt, user as userTable } from "@/db/schema";

// A fixed clock and two addresses: time is moved by arithmetic, never slept through.
const NOW = 1_700_000_000;
const IP_A = "198.51.100.4";
const IP_B = "198.51.100.99";

const OLD = "correct-horse-battery";
const NEW = "a-brand-new-passphrase";
const WRONG = "wrong-horse-battery";

let counter = 0;
let account: User;

// A new account per test: changing a password is the thing under test, so
// tests can't share one.
beforeEach(async () => {
  await getDb().delete(loginAttempt);
  counter += 1;
  const created = await createUser({
    email: `change${counter}@example.com`,
    passwordHash: await hashPassword(OLD),
    homeClubId: "omagh",
  });
  assert.equal(created.result, "created");
  if (created.result === "created") account = created.user;
});

function change(fields: Record<string, string | File>, who: User | null = account, ip: string | null = IP_A, now = NOW) {
  const formData = new FormData();
  formData.set("current", OLD);
  formData.set("new", NEW);
  formData.set("confirm", NEW);
  for (const [name, value] of Object.entries(fields)) formData.set(name, value);
  return submitPasswordChange(who, formData, { now, ip });
}

async function storedHash(): Promise<string> {
  const stored = await getUserCredentialsById(account.id);
  assert.ok(stored);
  return stored.passwordHash;
}

function logIn(password: string, now = NOW, ip = IP_B) {
  const formData = new FormData();
  formData.set("email", account.email);
  formData.set("password", password);
  return submitLogin(formData, { now, ip });
}

async function failTimes(times: number, ip = IP_A, now = NOW) {
  for (let i = 0; i < times; i++) {
    assert.deepEqual(await change({ current: WRONG }, account, ip, now), { redirect: "/account?error=password-wrong" });
  }
}

/** A refusal: this redirect, no session, and the stored hash exactly as it was. */
async function assertRefused(result: SubmitResult, redirect: string, hashBefore: string) {
  assert.deepEqual(result, { redirect });
  assert.equal(await storedHash(), hashBefore, "nothing written");
}

test("success changes the stored hash: the new password logs in and the old one does not", async () => {
  const before = await storedHash();
  const result = await change({});
  assert.equal(result.redirect, "/account?saved=password");

  const after = await storedHash();
  assert.notEqual(after, before);
  assert.ok(after.startsWith("scrypt$"));
  assert.ok(!after.includes(NEW));
  assert.ok(await verifyPassword(NEW, after));
  assert.ok(!(await verifyPassword(OLD, after)));

  assert.equal((await logIn(NEW)).session?.id, account.id);
  assert.deepEqual(await logIn(OLD), { redirect: "/?failed=1" });
});

test("success returns a fresh session under the new hash; the old cookie's fingerprint no longer matches", async () => {
  const before = await storedHash();
  const oldCookie = signSession({ sub: account.id, exp: NOW + 1000, pwd: passwordFingerprint(before) });
  const result = await change({});

  const after = await storedHash();
  assert.deepEqual(result.session, { id: account.id, passwordHash: after, theme: "system" });

  // What getCurrentUser compares: the old cookie no longer matches the stored hash, a new one does.
  const oldPayload = verifySession(oldCookie, NOW);
  assert.ok(oldPayload);
  assert.notEqual(oldPayload.pwd, passwordFingerprint(after));
  const fresh = signSession({ sub: account.id, exp: NOW + 1000, pwd: passwordFingerprint(result.session!.passwordHash) });
  assert.equal(verifySession(fresh, NOW)?.pwd, passwordFingerprint(after));
});

test("a wrong current password is refused, counted, and writes nothing", async () => {
  const before = await storedHash();
  await assertRefused(await change({ current: WRONG }), "/account?error=password-wrong", before);

  // Counted: the failures lock it at the limit. (One is already made.)
  await failTimes(LOGIN_FAILURE_LIMIT - 1);
  assert.deepEqual(await change({}), { redirect: "/account?wait=1" });
});

test("once locked, even the right current password is refused until the lock lifts", async () => {
  const before = await storedHash();
  await failTimes(LOGIN_FAILURE_LIMIT);

  // Locked: the password isn't even checked, so the right one gets nowhere.
  await assertRefused(await change({}), "/account?wait=1", before);
  await assertRefused(await change({}, account, IP_A, NOW + 59), "/account?wait=1", before);

  // The moment it lifts, the right one works.
  assert.equal((await change({}, account, IP_A, NOW + 60)).redirect, "/account?saved=password");
});

test("four failures leave the right password working, and a success clears the count", async () => {
  await failTimes(LOGIN_FAILURE_LIMIT - 1);
  assert.equal((await change({ current: OLD, new: NEW, confirm: NEW })).redirect, "/account?saved=password");

  // Cleared: four more failures (now against the new password) still don't lock.
  await failTimes(LOGIN_FAILURE_LIMIT - 1);
  assert.equal((await change({ current: NEW, new: OLD, confirm: OLD })).redirect, "/account?saved=password");
});

test("the lockout is per account and address: another address, or another account, is not locked", async () => {
  await failTimes(LOGIN_FAILURE_LIMIT);
  assert.deepEqual(await change({}), { redirect: "/account?wait=1" });
  assert.equal((await change({}, account, IP_B)).redirect, "/account?saved=password");
});

test("one address trying wrong passwords on many accounts is locked as a whole", async () => {
  const others: User[] = [];
  for (let i = 0; i < IP_FAILURE_LIMIT; i++) {
    const created = await createUser({
      email: `spray${counter}-${i}@example.com`,
      passwordHash: await hashPassword(OLD),
      homeClubId: "omagh",
    });
    assert.equal(created.result, "created");
    if (created.result === "created") others.push(created.user);
  }
  for (const other of others) await change({ current: WRONG }, other, IP_A);
  assert.deepEqual(await change({}), { redirect: "/account?wait=1" });
});

test("a limiter that can't be written fails closed: refused, flagged as an outage, nothing written", async () => {
  const before = await storedHash();
  await getDb().run(sql`ALTER TABLE login_attempt RENAME TO login_attempt_gone`);
  try {
    await assertRefused(await change({}), "/account?wait=0", before);
  } finally {
    await getDb().run(sql`ALTER TABLE login_attempt_gone RENAME TO login_attempt`);
  }
});

test("a too-short, mismatched, same-as-current, empty or oversize input is refused with nothing written", async () => {
  const before = await storedHash();
  const short = "x".repeat(PASSWORD_MIN_LENGTH - 1);
  const long = "y".repeat(PASSWORD_MAX_LENGTH + 1);

  await assertRefused(await change({ new: short, confirm: short }), "/account?error=password-short", before);
  await assertRefused(await change({ confirm: `${NEW}!` }), "/account?error=password-mismatch", before);
  await assertRefused(await change({ new: OLD, confirm: OLD }), "/account?error=password-same", before);
  await assertRefused(await change({ current: "" }), "/account?error=password-invalid", before);
  await assertRefused(await change({ current: long }), "/account?error=password-invalid", before);
  await assertRefused(await change({ new: long, confirm: long }), "/account?error=password-invalid", before);
  await assertRefused(await change({ confirm: long }), "/account?error=password-invalid", before);

  // Exactly the limits are fine: the floor and the cap.
  const floor = "z".repeat(PASSWORD_MIN_LENGTH);
  assert.equal((await change({ new: floor, confirm: floor })).redirect, "/account?saved=password");
  const cap = "w".repeat(PASSWORD_MAX_LENGTH);
  assert.equal((await change({ current: floor, new: cap, confirm: cap })).redirect, "/account?saved=password");
});

test("these refusals cost no attempt: the limiter isn't touched", async () => {
  const short = "x".repeat(PASSWORD_MIN_LENGTH - 1);
  for (let i = 0; i < LOGIN_FAILURE_LIMIT * 2; i++) await change({ new: short, confirm: short, current: WRONG });
  assert.equal((await getDb().select().from(loginAttempt)).length, 0);
  assert.equal((await change({})).redirect, "/account?saved=password");
});

test("missing and non-string fields (a hand-made request) are refused, not crashed", async () => {
  const before = await storedHash();
  const invalid = "/account?error=password-invalid";

  await assertRefused(await submitPasswordChange(account, new FormData(), { now: NOW, ip: IP_A }), invalid, before);

  const file = new File(["not a password"], "password.txt");
  await assertRefused(await change({ current: file }), invalid, before);
  await assertRefused(await change({ new: file }), invalid, before);
  await assertRefused(await change({ confirm: file }), invalid, before);

  for (const name of ["current", "new", "confirm"]) {
    const formData = new FormData();
    for (const field of ["current", "new", "confirm"]) if (field !== name) formData.set(field, field === "current" ? OLD : NEW);
    await assertRefused(await submitPasswordChange(account, formData, { now: NOW, ip: IP_A }), invalid, before);
  }
});

test("a visitor is refused and nothing is read or written", async () => {
  const before = await storedHash();
  assert.deepEqual(await change({}, null), { redirect: "/" });
  assert.deepEqual(await change({ current: WRONG }, null), { redirect: "/" });
  assert.equal(await storedHash(), before);
  assert.equal((await getDb().select().from(loginAttempt)).length, 0);
});

test("a stale-hash write is refused and writes nothing", async () => {
  const before = await storedHash();
  const other = await hashPassword("some-other-passphrase");

  assert.equal(await changePasswordHash(account.id, "scrypt$not-the-stored-hash", other), "stale");
  assert.equal(await storedHash(), before);

  assert.equal(await changePasswordHash(account.id, before, other), "changed");
  assert.equal(await storedHash(), other);
  // The same expected hash can't win twice.
  assert.equal(await changePasswordHash(account.id, before, await hashPassword("third-passphrase-x")), "stale");
  assert.equal(await storedHash(), other);

  assert.equal(await changePasswordHash(account.id + 100_000, before, other), "not-found");
});

test("two changes racing from the same old password: one wins, the other writes nothing", async () => {
  const [a, b] = await Promise.all([
    change({ new: "first-racing-passphrase", confirm: "first-racing-passphrase" }),
    change({ new: "second-racing-passphrase", confirm: "second-racing-passphrase" }, account, IP_B),
  ]);
  const results = [a, b];
  const winners = results.filter((result) => result.session);
  assert.equal(winners.length, 1, "exactly one succeeds");
  const loser = results.find((result) => !result.session);
  assert.deepEqual(loser, { redirect: "/account?error=password-stale" });

  const stored = await storedHash();
  assert.equal(stored, winners[0]?.session?.passwordHash);
  assert.ok(await verifyPassword(a.session ? "first-racing-passphrase" : "second-racing-passphrase", stored));
  assert.ok(!(await verifyPassword(a.session ? "second-racing-passphrase" : "first-racing-passphrase", stored)));
});

test("the user row's other columns are untouched by a change", async () => {
  const [before] = await getDb().select().from(userTable).where(eq(userTable.id, account.id));
  await change({});
  const [after] = await getDb().select().from(userTable).where(eq(userTable.id, account.id));
  assert.ok(before && after);
  assert.deepEqual({ ...after, passwordHash: "" }, { ...before, passwordHash: "" });
});
