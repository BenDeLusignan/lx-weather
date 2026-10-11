// Must be first: it sets up the test database and the session secret.
import { usersWithEmail } from "@/data/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword } from "@/auth/password";
import { submitLogin, submitSignUp } from "@/auth/submit";
import { createUser, updatePreferences, type User } from "@/data/users";
import { DEFAULT_PREFERENCES } from "./preferences";
import { submitDays, submitHours, submitTheme } from "./submit";

const NOW = 1_700_000_000;

async function newUser(email: string): Promise<User> {
  const created = await createUser({ email, passwordHash: await hashPassword("correct-horse-battery"), homeClubId: "omagh" });
  assert.equal(created.result, "created");
  if (created.result !== "created") throw new Error("not created");
  return { id: created.user.id, email, homeClubId: "omagh", preferences: created.user.preferences };
}

const form = (name: string, ...values: string[]) => {
  const formData = new FormData();
  for (const value of values) formData.append(name, value);
  return formData;
};

async function stored(email: string) {
  const [row] = await usersWithEmail(email);
  assert.ok(row);
  return { theme: row.theme, days: row.days, hours: row.hours };
}

const UNTOUCHED = { theme: "system", days: 127, hours: 4095 };

test("a new account has the defaults: follow the device, every day, every hour", async () => {
  const me = await newUser("defaults@example.com");
  assert.deepEqual(me.preferences, DEFAULT_PREFERENCES);
  assert.deepEqual(await stored("defaults@example.com"), UNTOUCHED);
});

// The page the header's switch was used on: both a save and a refusal go back to it.
const PAGE = "/away/omagh";

test("the theme saves and goes back to the page, saying which theme so the device's cookie follows", async () => {
  const me = await newUser("theme@example.com");
  assert.deepEqual(await submitTheme(me, form("theme", "dark"), PAGE), { redirect: PAGE, theme: "dark" });
  assert.equal((await stored("theme@example.com")).theme, "dark");
  assert.deepEqual(await submitTheme(me, form("theme", "light"), PAGE), { redirect: PAGE, theme: "light" });
  assert.equal((await stored("theme@example.com")).theme, "light");
  // Not offered by the switch, but a valid stored value: saved, not refused.
  assert.deepEqual(await submitTheme(me, form("theme", "system"), PAGE), { redirect: PAGE, theme: "system" });
  assert.equal((await stored("theme@example.com")).theme, "system");
});

test("an unknown, missing or repeated theme changes nothing, sets no cookie and goes back to the page", async () => {
  const me = await newUser("badtheme@example.com");
  for (const bad of ["purple", "", "DARK", "dark ", "system; drop table user"]) {
    assert.deepEqual(await submitTheme(me, form("theme", bad), PAGE), { redirect: PAGE }, bad);
  }
  assert.deepEqual(await submitTheme(me, new FormData(), PAGE), { redirect: PAGE }, "nothing posted");
  assert.deepEqual(await submitTheme(me, form("theme", "dark", "light"), PAGE), { redirect: PAGE }, "two values: FormData.get would pick the first");
  assert.deepEqual(await submitTheme(me, form("theme", new File([], "dark") as unknown as string), PAGE), { redirect: PAGE }, "a file");
  assert.deepEqual(await stored("badtheme@example.com"), UNTOUCHED);
});

test("days save and persist, in any order and with repeats", async () => {
  const me = await newUser("days@example.com");
  assert.deepEqual(await submitDays(me, form("days", "sun", "sat", "sat")), { redirect: "/account?saved=days" });
  assert.equal((await stored("days@example.com")).days, 0b1100000);
});

test("no days, or a day that isn't one, is refused whole: nothing is saved, not even the valid ones", async () => {
  const me = await newUser("baddays@example.com");
  assert.deepEqual(await submitDays(me, new FormData()), { redirect: "/account?error=days" });
  assert.deepEqual(await submitDays(me, form("days", "sat", "someday")), { redirect: "/account?error=days" });
  assert.deepEqual(await submitDays(me, form("days", "Sat")), { redirect: "/account?error=days" });
  assert.deepEqual(await submitDays(me, form("days", "7")), { redirect: "/account?error=days" });
  assert.deepEqual(await stored("baddays@example.com"), UNTOUCHED);
});

test("hours save and persist", async () => {
  const me = await newUser("hours@example.com");
  assert.deepEqual(await submitHours(me, form("hours", "21", "18", "19", "20")), { redirect: "/account?saved=hours" });
  assert.equal((await stored("hours@example.com")).hours, 0b111100000000);
});

test("no hours, or one outside 10 to 21, or not written exactly, is refused and nothing changes", async () => {
  const me = await newUser("badhours@example.com");
  assert.deepEqual(await submitHours(me, new FormData()), { redirect: "/account?error=hours" });
  for (const bad of ["9", "22", "-1", "1000", "010", "10.5", "NaN", "", "ten"]) {
    assert.deepEqual(await submitHours(me, form("hours", "12", bad)), { redirect: "/account?error=hours" }, bad);
  }
  assert.deepEqual(await stored("badhours@example.com"), UNTOUCHED);
});

test("each form saves only its own setting", async () => {
  const me = await newUser("separate@example.com");
  await submitDays(me, form("days", "mon"));
  await submitHours(me, form("hours", "10"));
  await submitTheme(me, form("theme", "light"), "/");
  assert.deepEqual(await stored("separate@example.com"), { theme: "light", days: 1, hours: 1 });
  // A refused post leaves the others as they were.
  await submitDays(me, new FormData());
  assert.deepEqual(await stored("separate@example.com"), { theme: "light", days: 1, hours: 1 });
});

test("a visitor can't save anything", async () => {
  const me = await newUser("visitor@example.com");
  assert.deepEqual(await submitTheme(null, form("theme", "dark"), "/account"), { redirect: "/" });
  assert.deepEqual(await submitDays(null, form("days", "mon")), { redirect: "/" });
  assert.deepEqual(await submitHours(null, form("hours", "10")), { redirect: "/" });
  assert.deepEqual(await stored("visitor@example.com"), UNTOUCHED);
  void me;
});

test("a session for a user who no longer exists is sent to the landing page", async () => {
  const ghost: User = { id: 999_999, email: "ghost@example.com", homeClubId: "omagh", preferences: DEFAULT_PREFERENCES };
  assert.deepEqual(await submitDays(ghost, form("days", "mon")), { redirect: "/" });
});

test("the write itself refuses what the form parsing would have, whatever the caller did", async () => {
  const me = await newUser("write@example.com");
  assert.equal(await updatePreferences(me.id, { days: [] }), "invalid");
  assert.equal(await updatePreferences(me.id, { days: [7] }), "invalid");
  assert.equal(await updatePreferences(me.id, { hours: [] }), "invalid");
  assert.equal(await updatePreferences(me.id, { hours: [9] }), "invalid");
  assert.equal(await updatePreferences(me.id, { hours: [22] }), "invalid");
  assert.equal(await updatePreferences(me.id, { theme: "neon" as never }), "invalid");
  assert.equal(await updatePreferences(me.id, {}), "invalid", "nothing to write");
  // One bad part refuses the whole change: the good theme is not saved either.
  assert.equal(await updatePreferences(me.id, { theme: "dark", days: [] }), "invalid");
  assert.deepEqual(await stored("write@example.com"), UNTOUCHED);

  assert.equal(await updatePreferences(me.id, { theme: "dark", days: [5, 6], hours: [18] }), "saved");
  assert.deepEqual(await stored("write@example.com"), { theme: "dark", days: 0b1100000, hours: 0b100000000 });
  assert.equal(await updatePreferences(999_999, { theme: "dark" }), "not-found");
});

test("the table itself refuses an empty or out-of-range set from a raw write", async () => {
  const me = await newUser("raw@example.com");
  const { getDb } = await import("@/db/client");
  const { user } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  for (const bad of [{ days: 0 }, { days: 128 }, { hours: 0 }, { hours: 4096 }, { theme: "neon" }]) {
    await assert.rejects(getDb().update(user).set(bad).where(eq(user.id, me.id)), String(JSON.stringify(bad)));
  }
  assert.deepEqual(await stored("raw@example.com"), UNTOUCHED);
});

test("log in and sign up carry the account's theme, so the device's theme cookie follows who just logged in", async () => {
  const me = await newUser("carry@example.com");
  await submitTheme(me, form("theme", "light"), "/");

  const login = new FormData();
  login.set("email", "carry@example.com");
  login.set("password", "correct-horse-battery");
  const result = await submitLogin(login, { now: NOW, ip: "198.51.100.20" });
  assert.equal(result.session?.theme, "light");

  const signup = new FormData();
  signup.set("email", "fresh@example.com");
  signup.set("password", "correct-horse-battery");
  signup.set("homeClub", "omagh");
  assert.equal((await submitSignUp(signup, { now: NOW, ip: "198.51.100.21" })).session?.theme, "system");
});
