import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWeek, combineLights, type Light } from "./blocks";
import { column, forecastOf } from "./fixtures";

// 11 Oct 2026 is BST (UTC+1): UK midnight is 23:00 UTC the evening before.
const MIDNIGHT_11_OCT = "2026-10-10T23:00:00.000Z";
const WEEK_HOURS = 7 * 24 + 1;

/** Every provider says the same constant for every hour, unless a column is given. */
function constantWeek(values: { temp?: number; rain?: number; wind?: number }) {
  const col = (v: number | undefined) =>
    v === undefined ? undefined : column(MIDNIGHT_11_OCT, WEEK_HOURS, () => v);
  const one = {
    temperatureC: col(values.temp),
    rainChancePercent: col(values.rain),
    windMph: col(values.wind),
  };
  const clean = Object.fromEntries(Object.entries(one).filter(([, v]) => v !== undefined));
  return forecastOf(MIDNIGHT_11_OCT, WEEK_HOURS, {
    ukmo: clean,
    ecmwf: clean,
    icon: clean,
    gfs: clean,
    gem: clean,
  });
}

test("the worse of rain and wind wins; an unknown is never guessed", () => {
  const cases: [Light | null, Light | null, Light | null][] = [
    ["green", "green", "green"],
    ["green", "yellow", "yellow"],
    ["yellow", "green", "yellow"],
    ["yellow", "yellow", "yellow"],
    ["green", "red", "red"],
    ["red", "yellow", "red"],
    ["red", null, "red"], // red whatever the other is
    [null, "red", "red"],
    ["green", null, null], // cannot call it green without both figures
    [null, "yellow", null],
    [null, null, null],
  ];
  for (const [rain, wind, expected] of cases) {
    assert.equal(combineLights(rain, wind), expected, `rain ${rain}, wind ${wind}`);
  }
});

test("a week is today plus six days, twelve blocks a day, 08:00-09:00 to 19:00-20:00 UK time", () => {
  const now = new Date(MIDNIGHT_11_OCT);
  const days = buildWeek(constantWeek({ temp: 10, rain: 0, wind: 0 }), { now });
  assert.deepEqual(
    days.map((d) => d.date),
    ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"],
  );
  for (const day of days) {
    assert.equal(day.blocks.length, 12);
    assert.deepEqual(day.blocks.map((b) => b.startHour), [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    assert.ok(day.blocks.every((b) => b.date === day.date));
  }
  // 08:00 BST is 07:00 UTC.
  assert.equal(days[0]?.blocks[0]?.start, "2026-10-11T07:00:00.000Z");
});

test("blocks of today that are over are omitted; the one in progress stays", () => {
  const forecast = constantWeek({ temp: 10, rain: 0, wind: 0 });
  // 11:30 BST: 08-09, 09-10 and 10-11 are over; 11-12 is under way.
  const midMorning = buildWeek(forecast, { now: new Date("2026-10-11T10:30:00.000Z") });
  assert.deepEqual(midMorning[0]?.blocks.map((b) => b.startHour), [11, 12, 13, 14, 15, 16, 17, 18, 19]);
  assert.equal(midMorning[1]?.blocks.length, 12);
  // Exactly 12:00 BST: the 11-12 block has just ended.
  const noon = buildWeek(forecast, { now: new Date("2026-10-11T11:00:00.000Z") });
  assert.equal(noon[0]?.blocks[0]?.startHour, 12);
  // 21:00 BST: nothing left today, but the day is still the first of the week.
  const evening = buildWeek(forecast, { now: new Date("2026-10-11T20:00:00.000Z") });
  assert.equal(evening[0]?.date, "2026-10-11");
  assert.equal(evening[0]?.blocks.length, 0);
  assert.equal(evening[1]?.date, "2026-10-12");
  assert.equal(evening[6]?.date, "2026-10-17");
});

test("today is the UK date, not the UTC date", () => {
  // 00:30 UK on 12 Oct (BST) is still 11 Oct in UTC.
  const days = buildWeek(constantWeek({ temp: 10 }), { now: new Date("2026-10-11T23:30:00.000Z") });
  assert.equal(days[0]?.date, "2026-10-12");
});

test("hour mapping: rain from the stamp ending the block, temperature and wind from the mean of its two stamps", () => {
  // Local hour h on 11 Oct sits at index h (the series starts at UK midnight),
  // so each value below says which stamp it came from.
  const byIndex = (v: (i: number) => number) => column(MIDNIGHT_11_OCT, WEEK_HOURS, v);
  const forecast = forecastOf(MIDNIGHT_11_OCT, WEEK_HOURS, {
    ukmo: {
      rainChancePercent: byIndex((i) => i),
      temperatureC: byIndex((i) => i * 2),
      windMph: byIndex((i) => i * 4),
    },
  });
  const block = buildWeek(forecast, { now: new Date(MIDNIGHT_11_OCT) })[0]?.blocks[0]; // 08:00-09:00
  assert.equal(block?.rainChancePercent.value, 9); // the 09:00 stamp
  assert.equal(block?.temperatureC.value, 17); // mean of 8*2 and 9*2
  assert.equal(block?.wind.mph, 34); // mean of 8*4 and 9*4
  assert.equal(block?.wind.kmh, 34 * 1.609344);
});

test("a gap is a gap: a provider missing one of a block's stamps gives nothing for that block only", () => {
  const full = column(MIDNIGHT_11_OCT, WEEK_HOURS, () => 20);
  const gappy = full.map((v, i) => (i === 9 ? null : v)); // the 09:00 stamp of the first block
  const forecast = forecastOf(MIDNIGHT_11_OCT, WEEK_HOURS, {
    ukmo: { temperatureC: gappy, rainChancePercent: gappy, windMph: gappy },
    ecmwf: { temperatureC: full, rainChancePercent: full, windMph: full },
  });
  const [first, second, third] = buildWeek(forecast, { now: new Date(MIDNIGHT_11_OCT) })[0]?.blocks ?? [];
  // 08-09 needs the 09:00 stamp: ukmo drops out of all three figures.
  assert.equal(first?.rainChancePercent.providerCount, 1);
  assert.equal(first?.temperatureC.providerCount, 1);
  assert.equal(first?.wind.providerCount, 1);
  assert.equal(first?.temperatureC.byProvider.ukmo, null);
  // 09-10 also needs it (its start stamp, for temperature and wind), but its rain only needs 10:00.
  assert.equal(second?.rainChancePercent.providerCount, 2);
  assert.equal(second?.temperatureC.providerCount, 1);
  // 10-11 is untouched.
  assert.equal(third?.temperatureC.providerCount, 2);
  assert.equal(third?.rainChancePercent.providerCount, 2);
});

test("the lights follow the rounded figures and the block takes the worse", () => {
  // Rain 70.4 shows as 70 (yellow); wind 9.5 shows as 10 (yellow).
  const yellow = buildWeek(constantWeek({ temp: 10, rain: 70.4, wind: 9.5 }), {
    now: new Date(MIDNIGHT_11_OCT),
  })[0]?.blocks[0];
  assert.equal(yellow?.rainLight, "yellow");
  assert.equal(yellow?.windLight, "yellow");
  assert.equal(yellow?.light, "yellow");
  // Calm but wet: rain decides.
  const wet = buildWeek(constantWeek({ temp: 10, rain: 80, wind: 2 }), { now: new Date(MIDNIGHT_11_OCT) })[0]
    ?.blocks[0];
  assert.equal(wet?.light, "red");
  // Dry but gale: wind decides.
  const gale = buildWeek(constantWeek({ temp: 10, rain: 0, wind: 25 }), { now: new Date(MIDNIGHT_11_OCT) })[0]
    ?.blocks[0];
  assert.equal(gale?.rainLight, "green");
  assert.equal(gale?.light, "red");
});

test("a block with no data is returned with null figures and a null light, never dropped or zero", () => {
  // The forecast covers day one only; days two to seven have no stamps at all.
  const oneDay = forecastOf(MIDNIGHT_11_OCT, 25, {
    ukmo: {
      temperatureC: column(MIDNIGHT_11_OCT, 25, () => 10),
      rainChancePercent: column(MIDNIGHT_11_OCT, 25, () => 0),
      windMph: column(MIDNIGHT_11_OCT, 25, () => 0),
    },
  });
  const days = buildWeek(oneDay, { now: new Date(MIDNIGHT_11_OCT) });
  assert.equal(days.length, 7);
  assert.equal(days[0]?.blocks[0]?.light, "green");
  for (const block of days[1]?.blocks ?? []) {
    assert.equal(block.temperatureC.value, null);
    assert.equal(block.rainChancePercent.value, null);
    assert.equal(block.wind.mph, null);
    assert.equal(block.wind.kmh, null);
    assert.equal(block.temperatureC.providerCount, 0);
    assert.equal(block.rainLight, null);
    assert.equal(block.windLight, null);
    assert.equal(block.light, null);
  }
  assert.equal(days[1]?.blocks.length, 12);
});

test("rain is known but wind is not: yellow/green is unknown, red stays red", () => {
  const rainOnly = (rain: number) =>
    forecastOf(MIDNIGHT_11_OCT, WEEK_HOURS, {
      ukmo: { rainChancePercent: column(MIDNIGHT_11_OCT, WEEK_HOURS, () => rain) },
    });
  const now = new Date(MIDNIGHT_11_OCT);
  assert.equal(buildWeek(rainOnly(10), { now })[0]?.blocks[0]?.light, null);
  assert.equal(buildWeek(rainOnly(90), { now })[0]?.blocks[0]?.light, "red");
});

test("a clock change inside the week: the day has 25 hours but still twelve blocks at the right UK times", () => {
  // Clocks go back at 02:00 BST on Sun 25 Oct 2026. UK midnight 24 Oct is 23:00 UTC on the 23rd.
  const start = "2026-10-23T23:00:00.000Z";
  const hours = 7 * 24 + 1 + 1;
  // Rain says which UTC hour its stamp is, so a wrong offset shows up.
  const utcHour = column(start, hours, (_, utc) => utc.getUTCHours());
  const forecast = forecastOf(start, hours, { ukmo: { rainChancePercent: utcHour } });
  const days = buildWeek(forecast, { now: new Date(start) });
  assert.deepEqual(
    days.map((d) => d.date),
    ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"],
  );
  for (const day of days) assert.equal(day.blocks.length, 12);
  // 24 Oct is BST: 08:00 UK = 07:00 UTC, rain from the 09:00 UK = 08:00 UTC stamp.
  assert.equal(days[0]?.blocks[0]?.start, "2026-10-24T07:00:00.000Z");
  assert.equal(days[0]?.blocks[0]?.rainChancePercent.value, 8);
  // 25 Oct (the long day) and after are GMT: 08:00 UK = 08:00 UTC.
  assert.equal(days[1]?.blocks[0]?.start, "2026-10-25T08:00:00.000Z");
  assert.equal(days[1]?.blocks[0]?.rainChancePercent.value, 9);
  assert.equal(days[1]?.blocks[11]?.start, "2026-10-25T19:00:00.000Z");
  assert.equal(days[2]?.blocks[0]?.start, "2026-10-26T08:00:00.000Z");
});
