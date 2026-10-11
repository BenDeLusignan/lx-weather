import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDayHeading, formatRainChance, formatTemperature, formatWind, providerCountNote } from "./format";

test("figures are rounded once, at display: whole % and mph and km/h, one decimal for °C", () => {
  assert.equal(formatRainChance(70.4), "70%");
  assert.equal(formatRainChance(70.5), "71%", "the number shown is the number the light used");
  assert.equal(formatWind(9.6, 15.45), "10 mph / 15 km/h");
  assert.equal(formatTemperature(11.46), "11.5 °C");
});

test("a temperature that rounds to zero has no minus sign", () => {
  assert.equal(formatTemperature(-0.04), "0.0 °C");
  assert.equal(formatTemperature(-0.06), "-0.1 °C");
});

test("a missing figure says so and never shows a number", () => {
  assert.equal(formatTemperature(null), "no data");
  assert.equal(formatRainChance(null), "no data");
  assert.equal(formatWind(null, null), "no data");
});

test("the provider count shows only when fewer than all five contributed", () => {
  assert.equal(providerCountNote(5), null);
  assert.equal(providerCountNote(4), "4 of 5 providers");
  assert.equal(providerCountNote(1), "1 of 5 providers");
  assert.equal(providerCountNote(0), null, "no figure at all is 'no data', not '0 of 5'");
});

test("a day heading is the calendar date's weekday, day and month", () => {
  assert.equal(formatDayHeading("2026-10-12"), "Monday 12 October");
  assert.equal(formatDayHeading("2026-03-29"), "Sunday 29 March");
});
