import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALL_DAYS_MASK,
  ALL_HOURS_MASK,
  BLOCK_HOURS,
  DEFAULT_PREFERENCES,
  WEEKDAYS,
  daysToMask,
  hoursToMask,
  isThemeChoice,
  isValidDays,
  isValidHours,
  parseDays,
  parseHours,
  preferencesFromRow,
  weekdayIndex,
} from "./preferences";

test("the defaults are the site as it was: follow the device, all seven days, all twelve hours", () => {
  assert.equal(DEFAULT_PREFERENCES.theme, "system");
  assert.deepEqual(DEFAULT_PREFERENCES.days, [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(DEFAULT_PREFERENCES.hours, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
});

test("the masks the schema writes in plain numbers match the constants (src/db/schema.ts, drizzle/0001)", () => {
  assert.equal(ALL_DAYS_MASK, 127);
  assert.equal(ALL_HOURS_MASK, 4095);
});

test("a row with the column defaults (an account from before these settings) reads as the defaults", () => {
  assert.deepEqual(preferencesFromRow({ theme: "system", days: 127, hours: 4095 }), DEFAULT_PREFERENCES);
});

test("a row reads back what was stored: Saturday and Sunday, 18:00 to 21:00", () => {
  const row = { theme: "dark", days: daysToMask([5, 6]), hours: hoursToMask([18, 19, 20, 21]) };
  assert.deepEqual(row, { theme: "dark", days: 0b1100000, hours: 0b111100000000 });
  assert.deepEqual(preferencesFromRow(row), { theme: "dark", days: [5, 6], hours: [18, 19, 20, 21] });
});

test("a stored value that can't be right reads as the default for that setting, never as an empty week", () => {
  for (const bad of [0, -1, 128, 1.5, Number.NaN, "127", null, undefined]) {
    assert.deepEqual(preferencesFromRow({ theme: "system", days: bad, hours: 4095 }).days, DEFAULT_PREFERENCES.days, String(bad));
  }
  for (const bad of [0, -1, 4096, 2.5, "x", null]) {
    assert.deepEqual(preferencesFromRow({ theme: "system", days: 127, hours: bad }).hours, DEFAULT_PREFERENCES.hours, String(bad));
  }
  assert.equal(preferencesFromRow({ theme: "purple", days: 127, hours: 4095 }).theme, "system");
});

test("the theme is one of system, light, dark and nothing else", () => {
  for (const ok of ["system", "light", "dark"]) assert.ok(isThemeChoice(ok), ok);
  for (const bad of ["", "Dark", " dark", "dark ", "auto", null, undefined, 1, ["dark"], new File([], "dark")]) {
    assert.ok(!isThemeChoice(bad), String(bad));
  }
});

test("days parse from the checked boxes: sorted, repeats collapse", () => {
  assert.deepEqual(parseDays(["sun", "mon", "sat"]), [0, 5, 6]);
  assert.deepEqual(parseDays(["tue", "tue", "tue"]), [1]);
  assert.deepEqual(parseDays(WEEKDAYS.map((day) => day.id)), [0, 1, 2, 3, 4, 5, 6]);
});

test("days: nothing chosen, an unknown day, or anything that isn't an exact day id is refused whole", () => {
  assert.equal(parseDays([]), null, "empty");
  for (const bad of ["", "Mon", "monday", "mon ", "0", "7", "funday", null, undefined, 1, new File([], "mon")]) {
    assert.equal(parseDays(["mon", bad]), null, `a valid day with ${String(bad)}`);
    assert.equal(parseDays([bad]), null, String(bad));
  }
});

test("hours parse from the checked boxes: sorted, repeats collapse", () => {
  assert.deepEqual(parseHours(["21", "10", "15"]), [10, 15, 21]);
  assert.deepEqual(parseHours(["12", "12"]), [12]);
  assert.deepEqual(parseHours(BLOCK_HOURS.map(String)), [...BLOCK_HOURS]);
});

test("hours: nothing chosen, outside 10 to 21, or not written exactly is refused whole", () => {
  assert.equal(parseHours([]), null, "empty");
  for (const bad of ["9", "22", "0", "-1", "010", " 10", "10 ", "10.0", "1e1", "0x0a", "ten", "", "NaN", null, undefined, 10, new File([], "10")]) {
    assert.equal(parseHours(["10", bad]), null, `a valid hour with ${String(bad)}`);
    assert.equal(parseHours([bad]), null, String(bad));
  }
});

test("the write's own checks: lists must be non-empty and in range", () => {
  assert.ok(isValidDays([0]) && isValidDays([0, 6]));
  assert.ok(!isValidDays([]) && !isValidDays([7]) && !isValidDays([-1]) && !isValidDays([1.5]));
  assert.ok(isValidHours([10]) && isValidHours([10, 21]));
  assert.ok(!isValidHours([]) && !isValidHours([9]) && !isValidHours([22]) && !isValidHours([10.5]));
});

test("a UK calendar date's weekday, Monday first", () => {
  assert.equal(weekdayIndex("2026-10-12"), 0, "Monday 12 October 2026");
  assert.equal(weekdayIndex("2026-10-11"), 6, "Sunday");
  assert.equal(weekdayIndex("2026-10-17"), 5, "Saturday");
  assert.equal(weekdayIndex("2026-03-29"), 6, "the day the clocks go forward is still Sunday");
});
