import assert from "node:assert/strict";
import { test } from "node:test";
import type { Block, Day } from "@/forecast/blocks";
import { DEFAULT_PREFERENCES } from "./preferences";
import { filterWeek } from "./week-view";

// A bare week: only what the filter reads (date, startHour) matters.
function block(date: string, startHour: number): Block {
  return { date, startHour, start: `${date}T${startHour}:00` } as unknown as Block;
}

function day(date: string, hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]): Day {
  return { date, blocks: hours.map((hour) => block(date, hour)) };
}

// Sunday 11 October 2026 is today; the week runs to Saturday 17 October.
const DATES = ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"];
const week = DATES.map((date) => day(date));

test("with the defaults the week comes back whole", () => {
  const shown = filterWeek(week, DEFAULT_PREFERENCES);
  assert.equal(shown.length, 7);
  assert.deepEqual(shown.map((s) => s.index), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(shown.map((s) => s.blocks.length), Array(7).fill(12));
  assert.deepEqual(shown.map((s) => s.day), week);
});

test("only Saturday and Sunday, 18:00 to 21:00: two days, four hours each, still in order", () => {
  const shown = filterWeek(week, { days: [5, 6], hours: [18, 19, 20, 21] });
  assert.deepEqual(shown.map((s) => s.day.date), ["2026-10-11", "2026-10-17"]);
  assert.deepEqual(shown.map((s) => s.index), [0, 6], "keeps its place in the week, so Today is still Today");
  for (const s of shown) assert.deepEqual(s.blocks.map((b) => b.startHour), [18, 19, 20, 21]);
});

test("today with every chosen hour already over stays, with no blocks, for the screen to say so", () => {
  // It is 19:30 on Sunday: today's blocks start at 19 (in progress) and 20, 21 are left; the user only wants mornings.
  const today = day("2026-10-11", [19, 20, 21]);
  const shown = filterWeek([today, ...week.slice(1)], { days: [0, 6], hours: [10, 11] });
  assert.deepEqual(shown.map((s) => s.day.date), ["2026-10-11", "2026-10-12"]);
  assert.deepEqual(shown[0]?.blocks, []);
  assert.equal(shown[1]?.blocks.length, 2);
});

test("a day that has no blocks at all (today after 22:00) stays too, empty", () => {
  const shown = filterWeek([day("2026-10-11", []), ...week.slice(1)], DEFAULT_PREFERENCES);
  assert.equal(shown.length, 7);
  assert.deepEqual(shown[0]?.blocks, []);
});

test("one day and one hour is a valid week of one block", () => {
  const shown = filterWeek(week, { days: [2], hours: [14] });
  assert.equal(shown.length, 1);
  assert.equal(shown[0]?.day.date, "2026-10-14", "Wednesday");
  assert.deepEqual(shown[0]?.blocks.map((b) => b.startHour), [14]);
});

test("the week's own blocks are never changed", () => {
  const before = JSON.stringify(week);
  filterWeek(week, { days: [0], hours: [10] });
  assert.equal(JSON.stringify(week), before);
});
