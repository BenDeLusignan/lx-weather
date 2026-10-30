import assert from "node:assert/strict";
import { test } from "node:test";
import type { Block, Day } from "@/forecast/blocks";
import { buildWeek } from "@/forecast/blocks";
import { column, forecastOf } from "@/forecast/fixtures";
import { DEFAULT_PREFERENCES, type DayHours } from "./preferences";
import { filterWeek, shownHourCounts } from "./week-view";

// A bare week: only what the filter reads (date, startHour) matters.
function block(date: string, startHour: number): Block {
  return { date, startHour, start: `${date}T${startHour}:00` } as unknown as Block;
}

const ALL_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function day(date: string, hours = ALL_HOURS): Day {
  return { date, blocks: hours.map((hour) => block(date, hour)) };
}

// Sunday 11 October 2026 is today; the week runs to Saturday 17 October.
const DATES = ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"];
const week = DATES.map((date) => day(date));

const WHOLE: DayHours = { start: 8, end: 21 };
const EVENING: DayHours = { start: 17, end: 21 };
const OFF = null;
const hoursOf = (shown: { blocks: Block[] }) => shown.blocks.map((b) => b.startHour);

// Monday first: Mon-Fri evenings from 17:00, Saturday and Sunday all day (Ben's own week).
const BENS_WEEK = [EVENING, EVENING, EVENING, EVENING, EVENING, WHOLE, WHOLE];

// A real forecast for the week from UK midnight on Wednesday 14 October 2026 (BST, so 23:00 UTC the evening before), every provider saying the same.
function wednesdayForecast() {
  const midnight = "2026-10-13T23:00:00.000Z";
  const hours = 7 * 24 + 1;
  const flat = {
    temperatureC: column(midnight, hours, () => 10),
    rainChancePercent: column(midnight, hours, () => 0),
    windMph: column(midnight, hours, () => 0),
  };
  return forecastOf(midnight, hours, { ukmo: flat, ecmwf: flat, icon: flat, gfs: flat, gem: flat });
}

test("with the defaults the week comes back whole: seven days of fourteen blocks", () => {
  const shown = filterWeek(week, DEFAULT_PREFERENCES);
  assert.equal(shown.length, 7);
  assert.deepEqual(shown.map((s) => s.index), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(shown.map((s) => s.blocks.length), Array(7).fill(14));
  assert.deepEqual(shown.map((s) => s.day), week);
});

test("each weekday keeps its own hours: weekday evenings from 17:00, the weekend all day", () => {
  const shown = filterWeek(week, { days: BENS_WEEK });
  assert.equal(shown.length, 7);
  // 11 Oct is a Sunday, 12-16 Monday to Friday, 17 a Saturday.
  assert.deepEqual(hoursOf(shown[0]!), ALL_HOURS, "Sunday");
  for (const monToFri of shown.slice(1, 6)) assert.deepEqual(hoursOf(monToFri), [17, 18, 19, 20, 21]);
  assert.deepEqual(hoursOf(shown[6]!), ALL_HOURS, "Saturday");
});

test("the range is inclusive at both ends and a single block is a day of one box", () => {
  const shown = filterWeek(week, { days: [{ start: 10, end: 12 }, { start: 8, end: 8 }, { start: 21, end: 21 }, OFF, OFF, OFF, OFF] });
  // 12 Oct is Monday, 13 Tuesday, 14 Wednesday; a Sunday today is off.
  assert.deepEqual(shown.map((s) => s.day.date), ["2026-10-12", "2026-10-13", "2026-10-14"]);
  assert.deepEqual(hoursOf(shown[0]!), [10, 11, 12]);
  assert.deepEqual(hoursOf(shown[1]!), [8]);
  assert.deepEqual(hoursOf(shown[2]!), [21]);
});

test("a day that is off is dropped and the rest keep their place in the week", () => {
  const shown = filterWeek(week, { days: [OFF, OFF, OFF, OFF, OFF, WHOLE, WHOLE] });
  assert.deepEqual(shown.map((s) => s.day.date), ["2026-10-11", "2026-10-17"]);
  assert.deepEqual(shown.map((s) => s.index), [0, 6], "keeps its place in the week, so Today is still Today");
});

test("today, once its chosen hours are over, stays with no blocks, for the screen to say 'No hours left today.'", () => {
  // It is 19:30 on Sunday: today's blocks start at 19 (in progress), 20 and 21; Sunday is set to 08:00 to 14:00.
  const today = day("2026-10-11", [19, 20, 21]);
  const shown = filterWeek([today, ...week.slice(1)], { days: [OFF, OFF, OFF, OFF, OFF, OFF, { start: 8, end: 14 }] });
  assert.deepEqual(shown.map((s) => s.day.date), ["2026-10-11"]);
  assert.deepEqual(shown[0]?.blocks, []);
});

test("today keeps only the part of its own range that is still to come", () => {
  // 18:30 on Sunday: 18, 19, 20 and 21 are left. Sunday is set to 17:00 to 20:00, Monday to 08:00 to 21:00.
  const today = day("2026-10-11", [18, 19, 20, 21]);
  const shown = filterWeek([today, ...week.slice(1)], { days: [WHOLE, OFF, OFF, OFF, OFF, OFF, { start: 17, end: 20 }] });
  assert.deepEqual(hoursOf(shown[0]!), [18, 19, 20]);
  assert.deepEqual(hoursOf(shown[1]!), ALL_HOURS);
});

test("a day that has no blocks at all (today after 22:00) stays too, empty", () => {
  const shown = filterWeek([day("2026-10-11", []), ...week.slice(1)], DEFAULT_PREFERENCES);
  assert.equal(shown.length, 7);
  assert.deepEqual(shown[0]?.blocks, []);
});

test("one day and one hour is a valid week of one block", () => {
  const shown = filterWeek(week, { days: [OFF, OFF, { start: 14, end: 14 }, OFF, OFF, OFF, OFF] });
  assert.equal(shown.length, 1);
  assert.equal(shown[0]?.day.date, "2026-10-14", "Wednesday");
  assert.deepEqual(hoursOf(shown[0]!), [14]);
});

test("the week's own blocks are never changed", () => {
  const before = JSON.stringify(week);
  filterWeek(week, { days: BENS_WEEK });
  assert.equal(JSON.stringify(week), before);
});

test("with the engine's real week: at 17:30 on a Wednesday set to 08:00 to 18:00, today keeps only the 17:00 block", () => {
  // 17:30 BST on Wednesday 14 October 2026 is 16:30 UTC.
  const built = buildWeek(wednesdayForecast(), {
    now: new Date("2026-10-14T16:30:00.000Z"),
  });
  const days: (DayHours | null)[] = [OFF, OFF, { start: 8, end: 17 }, OFF, OFF, OFF, OFF];
  const shown = filterWeek(built, { days });
  assert.equal(shown.length, 1);
  assert.equal(shown[0]?.index, 0);
  assert.deepEqual(hoursOf(shown[0]!), [17], "only the 17:00 block is both in range and not over");
});

test("the skeleton's shape: one count per shown day, in the week's order from today", () => {
  // Today is Sunday (index 6): Sunday, then Monday to Saturday.
  assert.deepEqual(shownHourCounts({ days: BENS_WEEK }, 6), [14, 5, 5, 5, 5, 5, 14]);
  // Today is Wednesday (index 2): Wed, Thu, Fri, Sat, Sun, Mon, Tue.
  assert.deepEqual(shownHourCounts({ days: BENS_WEEK }, 2), [5, 5, 5, 14, 14, 5, 5]);
  assert.deepEqual(shownHourCounts({ days: [OFF, OFF, OFF, OFF, OFF, { start: 9, end: 9 }, OFF] }, 6), [1]);
  assert.deepEqual(shownHourCounts(DEFAULT_PREFERENCES, 3), Array(7).fill(14));
});
