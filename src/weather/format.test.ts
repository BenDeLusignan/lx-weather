import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatDayHeading,
  formatRainChance,
  formatTemperature,
  formatWind,
  formatWindMph,
  formatWindParts,
  gridColumns,
  lightMeaning,
  lightWord,
  providerCountNote,
  spokenRainChance,
  spokenWindSpeed,
  timeRange,
  unknownReason,
} from "./format";
import { rainLight } from "../forecast/rain-light";
import { windLight } from "../forecast/wind-light";

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

test("the traffic light always has a word, so colour is never the only cue", () => {
  assert.equal(lightWord("green"), "Good");
  assert.equal(lightWord("yellow"), "Passable");
  assert.equal(lightWord("red"), "Unlikely");
  assert.equal(lightWord(null), "Unknown");
});

test("each light is explained in Ben's words (Core flow 3), and an unknown one says it can't be judged", () => {
  assert.equal(lightMeaning("green"), "A good chance of no rain or wind.");
  assert.equal(lightMeaning("yellow"), "A passable level of play.");
  assert.equal(lightMeaning("red"), "Very unlikely you will get to play.");
  assert.equal(lightMeaning(null), "Not enough data to judge.");
});

test("an unknown light says which figure couldn't be judged", () => {
  assert.equal(unknownReason({ rainLight: null, windLight: null }), "no rain or wind data");
  assert.equal(unknownReason({ rainLight: "green", windLight: null }), "no wind data");
  assert.equal(unknownReason({ rainLight: null, windLight: "yellow" }), "no rain data");
});

test("a block's time range is its hour, to the next", () => {
  assert.equal(timeRange(10), "10:00–11:00");
  assert.equal(timeRange(21), "21:00–22:00");
});

test("an hour sits in the same column on every day: two rows of six on a phone, one row of twelve on a wide screen", () => {
  assert.deepEqual(gridColumns(10), { phone: 1, wide: 1 });
  assert.deepEqual(gridColumns(15), { phone: 6, wide: 6 });
  assert.deepEqual(gridColumns(16), { phone: 1, wide: 7 }, "16:00 starts the phone's second row");
  assert.deepEqual(gridColumns(21), { phone: 6, wide: 12 });
});

test("wind comes as two parts so a narrow table can stack mph over km/h, and as one string everywhere else", () => {
  assert.deepEqual(formatWindParts(9.6, 15.45), { mph: "10 mph", kmh: "15 km/h" });
  assert.equal(formatWindParts(null, null), null);
  assert.equal(formatWindParts(9.6, null), null, "one unit without the other is no data, never half a figure");
});

test("the hour box shows wind in mph alone, rounded like the light, and says so when there is none", () => {
  assert.equal(formatWindMph(15.6), "16 mph");
  assert.equal(formatWindMph(9.4), "9 mph");
  assert.equal(formatWindMph(null), "no data");
});

test("a screen reader hears rain in percent and wind in miles per hour, and hears when a figure is missing", () => {
  assert.equal(spokenRainChance(3.2), "rain 3 percent");
  assert.equal(spokenWindSpeed(15.6), "wind 16 miles per hour");
  assert.equal(spokenRainChance(null), "rain, no data");
  assert.equal(spokenWindSpeed(null), "wind, no data");
});

test("the number in the hour box never disagrees with the box's light, at every rounding edge", () => {
  for (let tenths = 0; tenths <= 1000; tenths++) {
    const value = tenths / 10;
    const rain = Number.parseInt(formatRainChance(value), 10);
    const wind = Number.parseInt(formatWindMph(value), 10);
    assert.equal(rainLight(value), rain > 70 ? "red" : rain > 30 ? "yellow" : "green", `rain ${value}`);
    assert.equal(windLight(value), wind > 15 ? "red" : wind >= 10 ? "yellow" : "green", `wind ${value}`);
  }
  // The edges named in the brief: 30.4 shows 30 and is green; 15.5 shows 16 and is red.
  assert.deepEqual([formatRainChance(30.4), rainLight(30.4)], ["30%", "green"]);
  assert.deepEqual([formatRainChance(30.5), rainLight(30.5)], ["31%", "yellow"]);
  assert.deepEqual([formatWindMph(15.4), windLight(15.4)], ["15 mph", "yellow"]);
  assert.deepEqual([formatWindMph(15.5), windLight(15.5)], ["16 mph", "red"]);
});
