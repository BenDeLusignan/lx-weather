// Must be first: it sets up the test database and the session secret (see the file).
import "@/data/test-database";
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { hashPassword } from "@/auth/password";
import { submitLogin } from "@/auth/submit";
import { IP_FAILURE_LIMIT, LOGIN_FAILURE_LIMIT } from "@/data/limits";
import { createUser } from "@/data/users";
import { getDb } from "@/db/client";
import { loginAttempt } from "@/db/schema";
import { passwordMeetsRules } from "@/forms/password-rules";

const EMAIL = "login@example.com";
// Deliberately breaks the password rule (no number, capital or symbol): accounts made before it must keep working.
const PASSWORD = "correct-horse-battery";
const WRONG = "wrong-horse-battery";

// A fixed clock and two addresses: time is moved by arithmetic, never slept through.
const NOW = 1_700_000_000;
const IP_A = "198.51.100.4";
const IP_B = "198.51.100.99";

const FAILED = { redirect: "/?failed=1" };

let userId = 0;

beforeEach(async () => {
  await getDb().delete(loginAttempt);
  if (!userId) {
    const created = await createUser({ email: EMAIL, passwordHash: await hashPassword(PASSWORD), homeClubId: "omagh" });
    assert.equal(created.result, "created");
    if (created.result === "created") userId = created.user.id;
  }
});

function attempt(overrides: Record<string, string>, now: number, ip: string) {
  const formData = new FormData();
  formData.set("email", EMAIL);
  formData.set("password", PASSWORD);
  for (const [name, value] of Object.entries(overrides)) formData.set(name, value);
  return submitLogin(formData, { now, ip });
}

async function failTimes(times: number, { now, ip, email = EMAIL }: { now: number; ip: string; email?: string }) {
  let result = await attempt({ email, password: WRONG }, now, ip);
  for (let i = 1; i < times; i++) result = await attempt({ email, password: WRONG }, now, ip);
  return result;
}

test("logs in with the right password, whatever the capitals and spacing of the email", async () => {
  for (const email of [EMAIL, "  Login@Example.COM  "]) {
    const result = await attempt({ email }, NOW, IP_A);
    assert.equal(result.redirect, "/");
    assert.equal(result.session?.id, userId);
  }
});

test("an unknown email and a wrong password get exactly the same answer, and no session", async () => {
  const results = [
    await attempt({ email: "nobody@example.com", password: PASSWORD }, NOW, IP_A),
    await attempt({ email: "nobody@example.com", password: WRONG }, NOW, IP_A),
    await attempt({ password: WRONG }, NOW, IP_A),
    await attempt({ email: "not an email", password: PASSWORD }, NOW, IP_A),
  ];
  for (const result of results) assert.deepEqual(result, FAILED);
});

test("a hand-made request without fields, or with over-long ones, fails the same way", async () => {
  assert.deepEqual(await submitLogin(new FormData(), { now: NOW, ip: IP_A }), FAILED);
  assert.deepEqual(await attempt({ email: "x".repeat(300), password: "y".repeat(2000) }, NOW, IP_A), FAILED);
});

test("the fifth wrong password locks, the right one is refused while locked, and works after", async () => {
  assert.deepEqual(await failTimes(LOGIN_FAILURE_LIMIT, { now: NOW, ip: IP_A }), FAILED);

  // Locked: the password isn't even checked, so the right one gets nowhere.
  assert.deepEqual(await attempt({}, NOW, IP_A), { redirect: "/?locked=1" });
  assert.deepEqual(await attempt({}, NOW + 59, IP_A), { redirect: "/?locked=1" });

  // The moment it lifts, the right password works.
  const after = await attempt({}, NOW + 60, IP_A);
  assert.equal(after.redirect, "/");
  assert.equal(after.session?.id, userId);
});

test("four failures leave the right password working, and a success clears the count", async () => {
  await failTimes(LOGIN_FAILURE_LIMIT - 1, { now: NOW, ip: IP_A });
  assert.equal((await attempt({}, NOW, IP_A)).redirect, "/");
  // Cleared: four more failures still don't lock.
  await failTimes(LOGIN_FAILURE_LIMIT - 1, { now: NOW, ip: IP_A });
  assert.equal((await attempt({}, NOW, IP_A)).redirect, "/");
});

test("lockouts escalate: a minute, then five", async () => {
  await failTimes(LOGIN_FAILURE_LIMIT, { now: NOW, ip: IP_A });
  assert.deepEqual(await attempt({}, NOW, IP_A), { redirect: "/?locked=1" });

  const later = NOW + 60;
  await failTimes(LOGIN_FAILURE_LIMIT, { now: later, ip: IP_A });
  assert.deepEqual(await attempt({}, later, IP_A), { redirect: "/?locked=5" });
});

test("a stranger's failures don't lock the account's owner out from their own address", async () => {
  await failTimes(LOGIN_FAILURE_LIMIT, { now: NOW, ip: IP_A });
  assert.deepEqual(await attempt({}, NOW, IP_A), { redirect: "/?locked=1" });
  assert.equal((await attempt({}, NOW, IP_B)).redirect, "/");
});

test("one address trying many emails is locked as a whole", async () => {
  for (let i = 0; i < IP_FAILURE_LIMIT; i++) {
    await attempt({ email: `guess${i}@example.com`, password: WRONG }, NOW, IP_A);
  }
  // Not the email that was guessed: the address itself is locked now.
  assert.deepEqual(await attempt({}, NOW, IP_A), { redirect: "/?locked=1" });
  assert.equal((await attempt({}, NOW, IP_B)).redirect, "/");
});

test("login never applies the password rule: even a short, plain password still logs in", async () => {
  const plain = "abc";
  assert.ok(!passwordMeetsRules(plain));
  const created = await createUser({ email: "plain@example.com", passwordHash: await hashPassword(plain), homeClubId: "omagh" });
  assert.equal(created.result, "created");
  const result = await attempt({ email: "plain@example.com", password: plain }, NOW, IP_A);
  assert.equal(result.redirect, "/");
  assert.equal(result.session?.id, created.result === "created" ? created.user.id : undefined);
});
