import assert from "node:assert/strict";
import { test } from "node:test";
import { FIRST_BLOCK_HOUR, LAST_BLOCK_HOUR } from "@/forecast/blocks";
import {
  BLOCK_HOURS,
  DEFAULT_DAY_HOURS,
  DEFAULT_PREFERENCES,
  WEEKDAYS,
  daysFromColumns,
  daysToColumns,
  isThemeChoice,
  isValidDayHours,
  isValidDays,
  parseDays,
  preferencesFromRow,
  rangeFieldName,
  weekdayIndex,
  type DayColumnKey,
  type DayHours,
} from "./preferences";

const WHOLE: DayHours = { start: 8, end: 21 };
const OFF = null;

/** A Account-form post: the ticked days, and a start and end for each day named in `times` (ticked or not, as a browser sends them). */
function post(ticked: readonly string[], times: Record<string, [string, string]> = {}): FormData {
  const formData = new FormData();
  for (const id of ticked) formData.append("days", id);
  for (const weekday of WEEKDAYS) {
    const [start, end] = times[weekday.id] ?? ["8", "21"];
    formData.append(rangeFieldName(weekday.id, "start"), start);
    formData.append(rangeFieldName(weekday.id, "end"), end);
  }
  return formData;
}

test("the window is 08:00 to 22:00: fourteen block hours, 8 to 21 (Ben, 30 Oct 2026)", () => {
  assert.equal(FIRST_BLOCK_HOUR, 8);
  assert.equal(LAST_BLOCK_HOUR, 21);
  assert.deepEqual(BLOCK_HOURS, [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
});

test("the defaults: follow the device, every day, 08:00 to 22:00", () => {
  assert.equal(DEFAULT_PREFERENCES.theme, "system");
  assert.deepEqual(DEFAULT_PREFERENCES.days, Array(7).fill(WHOLE));
  assert.deepEqual(DEFAULT_DAY_HOURS, WHOLE);
});

test("a day's range: whole hours from 8 to 21, start no later than end, a single block allowed", () => {
  for (const ok of [WHOLE, { start: 8, end: 8 }, { start: 21, end: 21 }, { start: 17, end: 21 }, { start: 12, end: 13 }]) {
    assert.ok(isValidDayHours(ok), JSON.stringify(ok));
  }
  for (const bad of [
    { start: 7, end: 21 },
    { start: 8, end: 22 },
    { start: 22, end: 22 },
    { start: 18, end: 17 },
    { start: 8.5, end: 21 },
    { start: 8, end: 20.5 },
    { start: "8", end: 21 },
    { start: 8, end: null },
    { start: Number.NaN, end: 21 },
    { start: 8 },
    null,
    undefined,
    "8-21",
    8,
  ]) {
    assert.ok(!isValidDayHours(bad), JSON.stringify(bad));
  }
});

test("a week is seven entries, each off or a valid range, at least one on", () => {
  assert.ok(isValidDays(DEFAULT_PREFERENCES.days));
  assert.ok(isValidDays([OFF, OFF, OFF, OFF, OFF, OFF, { start: 17, end: 21 }]), "one day on is a valid week");
  assert.ok(!isValidDays(Array(7).fill(OFF)), "every day off");
  assert.ok(!isValidDays([]), "empty");
  assert.ok(!isValidDays(Array(6).fill(WHOLE)), "six days");
  assert.ok(!isValidDays(Array(8).fill(WHOLE)), "eight days");
  assert.ok(!isValidDays([{ start: 20, end: 10 }, ...Array(6).fill(WHOLE)]), "one bad range spoils the week");
});

test("a week becomes the row's columns and back: an off day is two NULLs", () => {
  const week = [{ start: 17, end: 21 }, OFF, OFF, OFF, OFF, WHOLE, { start: 9, end: 9 }];
  const columns = daysToColumns(week);
  assert.deepEqual(columns, {
    monStart: 17, monEnd: 21,
    tueStart: null, tueEnd: null,
    wedStart: null, wedEnd: null,
    thuStart: null, thuEnd: null,
    friStart: null, friEnd: null,
    satStart: 8, satEnd: 21,
    sunStart: 9, sunEnd: 9,
  });
  assert.deepEqual(daysFromColumns(columns), week);
});

test("a row with the column defaults reads as the defaults", () => {
  assert.deepEqual(preferencesFromRow({ theme: "system", ...daysToColumns(DEFAULT_PREFERENCES.days) }), DEFAULT_PREFERENCES);
});

test("a row reads back what was stored: weekdays from 17:00, the weekend all day, Wednesday off", () => {
  const week = [
    { start: 17, end: 21 },
    { start: 17, end: 21 },
    OFF,
    { start: 17, end: 21 },
    { start: 17, end: 21 },
    WHOLE,
    WHOLE,
  ];
  assert.deepEqual(preferencesFromRow({ theme: "dark", ...daysToColumns(week) }), { theme: "dark", days: week });
});

test("a stored value that can't be right reads as the whole window for that day, never as an empty week", () => {
  const good = daysToColumns(DEFAULT_PREFERENCES.days);
  const bad: Record<string, unknown>[] = [
    { monStart: 18, monEnd: 17 },
    { monStart: 7, monEnd: 21 },
    { monStart: 8, monEnd: 22 },
    { monStart: 8.5, monEnd: 21 },
    { monStart: null, monEnd: 21 },
    { monStart: 8, monEnd: null },
    { monStart: "8", monEnd: "21" },
    { monStart: undefined, monEnd: undefined },
  ];
  for (const overrides of bad) {
    const row = { theme: "system", ...good, ...overrides } as { theme: string } & Record<DayColumnKey, unknown>;
    assert.deepEqual(preferencesFromRow(row).days[0], WHOLE, JSON.stringify(overrides));
    assert.deepEqual(preferencesFromRow(row).days.slice(1), Array(6).fill(WHOLE), "the other days are untouched");
  }
});

test("a row with every day off reads as the default week, so the screen is never blank", () => {
  const allOff = daysToColumns(Array(7).fill(OFF));
  assert.deepEqual(preferencesFromRow({ theme: "light", ...allOff }), { theme: "light", days: DEFAULT_PREFERENCES.days });
});

test("an unknown stored theme reads as system", () => {
  assert.equal(preferencesFromRow({ theme: "purple", ...daysToColumns(DEFAULT_PREFERENCES.days) }).theme, "system");
});

test("the theme is one of system, light, dark and nothing else", () => {
  for (const ok of ["system", "light", "dark"]) assert.ok(isThemeChoice(ok), ok);
  for (const bad of ["", "Dark", " dark", "dark ", "auto", null, undefined, 1, ["dark"], new File([], "dark")]) {
    assert.ok(!isThemeChoice(bad), String(bad));
  }
});

test("the form's field names for a day's sliders", () => {
  assert.equal(rangeFieldName("mon", "start"), "mon-start");
  assert.equal(rangeFieldName("sun", "end"), "sun-end");
});

test("the form parses to a week: unticked days off, ticked days with their own hours", () => {
  const parsed = parseDays(
    post(["sat", "mon", "sun"], { mon: ["17", "21"], sat: ["8", "21"], sun: ["10", "14"], tue: ["9", "9"] }),
  );
  assert.deepEqual(parsed, {
    ok: true,
    days: [{ start: 17, end: 21 }, OFF, OFF, OFF, OFF, WHOLE, { start: 10, end: 14 }],
  });
});

test("the sliders of an unticked day are posted but ignored, however wrong", () => {
  const parsed = parseDays(post(["mon"], { tue: ["20", "9"], wed: ["x", "y"] }));
  assert.deepEqual(parsed, { ok: true, days: [WHOLE, OFF, OFF, OFF, OFF, OFF, OFF] });
});

test("a ticked day whose sliders are missing is refused", () => {
  const formData = new FormData();
  formData.append("days", "mon");
  assert.deepEqual(parseDays(formData), { ok: false, reason: "bad-times" });
});

test("repeated ticks of a day collapse", () => {
  assert.deepEqual(parseDays(post(["tue", "tue", "tue"])), { ok: true, days: [OFF, WHOLE, OFF, OFF, OFF, OFF, OFF] });
});

test("no day ticked is refused as such", () => {
  assert.deepEqual(parseDays(post([])), { ok: false, reason: "no-day" });
  assert.deepEqual(parseDays(new FormData()), { ok: false, reason: "no-day" });
});

test("an unknown, mis-cased or non-string day is refused whole, even beside a valid one", () => {
  for (const bad of ["", "Mon", "monday", "mon ", "0", "7", "funday"]) {
    const formData = post(["mon"]);
    formData.append("days", bad);
    assert.deepEqual(parseDays(formData), { ok: false, reason: "bad-times" }, JSON.stringify(bad));
  }
  const withFile = post(["mon"]);
  withFile.append("days", new File([], "mon"));
  assert.deepEqual(parseDays(withFile), { ok: false, reason: "bad-times" });
});

test("a ticked day's times must be whole hours 8 to 21, written exactly, start no later than end", () => {
  for (const [start, end] of [
    ["7", "21"],
    ["8", "22"],
    ["22", "22"],
    ["0", "21"],
    ["-1", "21"],
    ["18", "17"],
    ["21", "8"],
    ["08", "21"],
    [" 8", "21"],
    ["8 ", "21"],
    ["8.0", "21"],
    ["8.5", "21"],
    ["1e1", "21"],
    ["0x0a", "21"],
    ["eight", "21"],
    ["NaN", "21"],
    ["", "21"],
    ["8", ""],
  ] as const) {
    assert.deepEqual(parseDays(post(["mon"], { mon: [start, end] })), { ok: false, reason: "bad-times" }, `${start} to ${end}`);
  }
});

test("a start equal to its end is one block and allowed; the extremes are allowed", () => {
  assert.deepEqual(parseDays(post(["mon"], { mon: ["8", "8"] })).ok, true);
  assert.deepEqual(parseDays(post(["mon"], { mon: ["21", "21"] })).ok, true);
  assert.deepEqual(parseDays(post(["mon"], { mon: ["8", "21"] })).ok, true);
});

test("two values for one slider is a hand-made post and is refused, not read by its first", () => {
  const formData = post(["mon"]);
  formData.append(rangeFieldName("mon", "end"), "9");
  assert.deepEqual(parseDays(formData), { ok: false, reason: "bad-times" });
});

test("a UK calendar date's weekday, Monday first", () => {
  assert.equal(weekdayIndex("2026-10-12"), 0, "Monday 12 October 2026");
  assert.equal(weekdayIndex("2026-10-11"), 6, "Sunday");
  assert.equal(weekdayIndex("2026-10-17"), 5, "Saturday");
  assert.equal(weekdayIndex("2026-03-29"), 6, "the day the clocks go forward is still Sunday");
});
