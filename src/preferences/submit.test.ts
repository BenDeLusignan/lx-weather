// Must be first: it sets up the test database and the session secret.
import { usersWithEmail } from "@/data/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword } from "@/auth/password";
import { submitLogin, submitSignUp } from "@/auth/submit";
import { createUser, updatePreferences, type User } from "@/data/users";
import { getDb } from "@/db/client";
import { user } from "@/db/schema";
import {
  DEFAULT_PREFERENCES,
  WEEKDAYS,
  daysFromColumns,
  rangeFieldName,
  type DayHours,
} from "./preferences";
import { submitDays, submitTheme } from "./submit";
import { eq } from "drizzle-orm";

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

/** An Account post: the ticked days, and each day's start and end (default 8 and 21; a browser posts every slider, ticked or not). */
function daysForm(ticked: readonly string[], times: Record<string, [string, string]> = {}): FormData {
  const formData = new FormData();
  for (const id of ticked) formData.append("days", id);
  for (const weekday of WEEKDAYS) {
    const [start, end] = times[weekday.id] ?? ["8", "21"];
    formData.append(rangeFieldName(weekday.id, "start"), start);
    formData.append(rangeFieldName(weekday.id, "end"), end);
  }
  return formData;
}

async function stored(email: string) {
  const [row] = await usersWithEmail(email);
  assert.ok(row);
  return { theme: row.theme, days: daysFromColumns(row) };
}

const WHOLE: DayHours = { start: 8, end: 21 };
const UNTOUCHED = { theme: "system", days: Array(7).fill(WHOLE) };

test("a new account has the defaults: follow the device, every day, 08:00 to 22:00", async () => {
  const me = await newUser("defaults@example.com");
  assert.deepEqual(me.preferences, DEFAULT_PREFERENCES);
  assert.deepEqual(await stored("defaults@example.com"), UNTOUCHED);
  // The raw row, so the column defaults (not just the reader's fallback) are what is saved.
  const [row] = await usersWithEmail("defaults@example.com");
  assert.equal(row?.monStart, 8);
  assert.equal(row?.sunEnd, 21);
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

test("days and their own hours save and persist: weekdays from 17:00, the weekend all day", async () => {
  const me = await newUser("days@example.com");
  const weekday = ["17", "21"] as [string, string];
  const result = await submitDays(
    me,
    daysForm(["sun", "sat", "mon", "tue", "wed", "thu", "fri", "sat"], {
      mon: weekday,
      tue: weekday,
      wed: weekday,
      thu: weekday,
      fri: weekday,
    }),
  );
  assert.deepEqual(result, { redirect: "/account?saved=days" });
  const after = await stored("days@example.com");
  const evening: DayHours = { start: 17, end: 21 };
  assert.deepEqual(after.days, [evening, evening, evening, evening, evening, WHOLE, WHOLE]);
  const [row] = await usersWithEmail("days@example.com");
  assert.equal(row?.friStart, 17, "stored as the day's own columns");
  assert.equal(row?.satStart, 8);
});

test("a day that is unticked is saved as off, and the hours it posted are not kept", async () => {
  const me = await newUser("off@example.com");
  assert.deepEqual(await submitDays(me, daysForm(["mon", "sun"], { tue: ["10", "12"] })), { redirect: "/account?saved=days" });
  assert.deepEqual((await stored("off@example.com")).days, [WHOLE, null, null, null, null, null, WHOLE]);
  const [row] = await usersWithEmail("off@example.com");
  assert.equal(row?.tueStart, null);
  assert.equal(row?.tueEnd, null);
});

test("every day unticked is refused with its own message code, and nothing changes", async () => {
  const me = await newUser("noday@example.com");
  assert.deepEqual(await submitDays(me, daysForm([])), { redirect: "/account?error=days" });
  assert.deepEqual(await submitDays(me, new FormData()), { redirect: "/account?error=days" });
  assert.deepEqual(await stored("noday@example.com"), UNTOUCHED);
});

test("a start after its end, or a time out of bounds or not written exactly, is refused whole and nothing changes", async () => {
  const me = await newUser("badtimes@example.com");
  const bad: [string, string][] = [["18", "17"], ["7", "21"], ["8", "22"], ["08", "21"], ["8.5", "21"], ["", ""], ["x", "21"]];
  for (const times of bad) {
    // A valid change to Saturday rides along: it must not be saved either.
    assert.deepEqual(
      await submitDays(me, daysForm(["mon", "sat"], { mon: times, sat: ["10", "12"] })),
      { redirect: "/account?error=times" },
      times.join(" to "),
    );
  }
  assert.deepEqual(await submitDays(me, daysForm(["mon", "someday"])), { redirect: "/account?error=times" }, "an unknown day");
  assert.deepEqual(await stored("badtimes@example.com"), UNTOUCHED);
});

test("the time of an unticked day is never checked", async () => {
  const me = await newUser("unticked@example.com");
  assert.deepEqual(await submitDays(me, daysForm(["mon"], { tue: ["20", "9"] })), { redirect: "/account?saved=days" });
});

test("a refused post leaves the theme and the saved week as they were", async () => {
  const me = await newUser("separate@example.com");
  await submitDays(me, daysForm(["mon"], { mon: ["17", "21"] }));
  await submitTheme(me, form("theme", "light"), "/");
  const saved = { theme: "light", days: [{ start: 17, end: 21 }, null, null, null, null, null, null] };
  assert.deepEqual(await stored("separate@example.com"), saved);
  await submitDays(me, daysForm([]));
  assert.deepEqual(await stored("separate@example.com"), saved);
});

test("a visitor can't save anything", async () => {
  await newUser("visitor@example.com");
  assert.deepEqual(await submitTheme(null, form("theme", "dark"), "/account"), { redirect: "/" });
  assert.deepEqual(await submitDays(null, daysForm(["mon"])), { redirect: "/" });
  assert.deepEqual(await submitDays(null, daysForm([])), { redirect: "/" });
  assert.deepEqual(await stored("visitor@example.com"), UNTOUCHED);
});

test("a session for a user who no longer exists is sent to the landing page", async () => {
  const ghost: User = { id: 999_999, email: "ghost@example.com", homeClubId: "omagh", preferences: DEFAULT_PREFERENCES };
  assert.deepEqual(await submitDays(ghost, daysForm(["mon"])), { redirect: "/" });
});

test("the write itself refuses what the form parsing would have, whatever the caller did", async () => {
  const me = await newUser("write@example.com");
  const off = null;
  assert.equal(await updatePreferences(me.id, { days: [] }), "invalid");
  assert.equal(await updatePreferences(me.id, { days: Array(7).fill(off) }), "invalid", "every day off");
  assert.equal(await updatePreferences(me.id, { days: Array(6).fill(WHOLE) }), "invalid", "six days");
  assert.equal(await updatePreferences(me.id, { days: [{ start: 9, end: 8 }, ...Array(6).fill(WHOLE)] }), "invalid", "start after end");
  assert.equal(await updatePreferences(me.id, { days: [{ start: 7, end: 21 }, ...Array(6).fill(WHOLE)] }), "invalid", "before 8");
  assert.equal(await updatePreferences(me.id, { days: [{ start: 8, end: 22 }, ...Array(6).fill(WHOLE)] }), "invalid", "after 21");
  assert.equal(await updatePreferences(me.id, { days: [{ start: 8.5, end: 21 }, ...Array(6).fill(WHOLE)] }), "invalid", "not whole");
  assert.equal(await updatePreferences(me.id, { theme: "neon" as never }), "invalid");
  assert.equal(await updatePreferences(me.id, {}), "invalid", "nothing to write");
  // One bad part refuses the whole change: the good theme is not saved either.
  assert.equal(await updatePreferences(me.id, { theme: "dark", days: [] }), "invalid");
  assert.deepEqual(await stored("write@example.com"), UNTOUCHED);

  const week = [off, off, off, off, off, { start: 18, end: 21 }, { start: 9, end: 9 }];
  assert.equal(await updatePreferences(me.id, { theme: "dark", days: week }), "saved");
  assert.deepEqual(await stored("write@example.com"), { theme: "dark", days: week });
  assert.equal(await updatePreferences(999_999, { theme: "dark" }), "not-found");
});

test("the table itself refuses a half-set, out-of-range, crossed or all-off week from a raw write", async () => {
  const me = await newUser("raw@example.com");
  const allOff = Object.fromEntries(WEEKDAYS.flatMap((day) => [[`${day.id}Start`, null], [`${day.id}End`, null]]));
  for (const bad of [
    { monStart: 8, monEnd: null },
    { monStart: null, monEnd: 21 },
    { monStart: 7, monEnd: 21 },
    { monStart: 8, monEnd: 22 },
    { monStart: 22, monEnd: 22 },
    { monStart: 18, monEnd: 17 },
    { monStart: 8.5, monEnd: 21 },
    { monStart: "8x", monEnd: 21 },
    { sunStart: 20, sunEnd: 10 },
    { theme: "neon" },
    allOff,
  ]) {
    await assert.rejects(getDb().update(user).set(bad as never).where(eq(user.id, me.id)), JSON.stringify(bad));
  }
  assert.deepEqual(await stored("raw@example.com"), UNTOUCHED);
  // The bounds are inclusive, and one day on is enough.
  await getDb().update(user).set({ monStart: 8, monEnd: 8 }).where(eq(user.id, me.id));
  await getDb().update(user).set({ sunStart: 21, sunEnd: 21 }).where(eq(user.id, me.id));
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
  signup.set("password", "Correct-horse-battery-7");
  signup.set("homeClub", "omagh");
  assert.equal((await submitSignUp(signup, { now: NOW, ip: "198.51.100.21" })).session?.theme, "system");
});
