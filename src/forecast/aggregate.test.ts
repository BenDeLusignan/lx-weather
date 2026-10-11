import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateHours } from "./aggregate";
import { forecastOf } from "./fixtures";

test("rain chance is the mean; temperature is the median (odd count)", () => {
  const f = forecastOf(1, {
    ukmo: { rainChancePercent: [0], temperatureC: [10] },
    ecmwf: { rainChancePercent: [30], temperatureC: [11] },
    icon: { rainChancePercent: [90], temperatureC: [30] }, // outlier moves the mean, not the median
  });
  const [h] = aggregateHours(f);
  assert.equal(h?.rainChancePercent.value, 40);
  assert.equal(h?.temperatureC.value, 11);
  assert.equal(h?.rainChancePercent.providerCount, 3);
  assert.equal(h?.temperatureC.providerCount, 3);
});

test("even count: median is the mean of the two middle values", () => {
  const f = forecastOf(1, {
    ukmo: { windMph: [4], temperatureC: [-2] },
    ecmwf: { windMph: [10], temperatureC: [0] },
    icon: { windMph: [12], temperatureC: [1] },
    gfs: { windMph: [100], temperatureC: [20] },
  });
  const [h] = aggregateHours(f);
  assert.equal(h?.wind.mph, 11);
  assert.equal(h?.temperatureC.value, 0.5);
});

test("a provider with nulls lowers the count for those hours only", () => {
  const f = forecastOf(3, {
    ukmo: { rainChancePercent: [10, null, 10], temperatureC: [5, null, 5] },
    ecmwf: { rainChancePercent: [30, 30, 30], temperatureC: [7, 7, 7] },
  });
  const hours = aggregateHours(f);
  assert.deepEqual(hours.map((h) => h.rainChancePercent.providerCount), [2, 1, 2]);
  assert.deepEqual(hours.map((h) => h.rainChancePercent.value), [20, 30, 20]);
  assert.deepEqual(hours.map((h) => h.temperatureC.value), [6, 7, 6]);
  // The gap is kept as a gap in the source data, not filled from anywhere.
  assert.equal(hours[1]?.rainChancePercent.byProvider.ukmo, null);
  assert.equal(hours[1]?.rainChancePercent.byProvider.ecmwf, 30);
});

test("figures are counted independently (a provider can have temperature but no rain chance)", () => {
  const f = forecastOf(1, {
    ukmo: { temperatureC: [8], windMph: [5] },
    ecmwf: { temperatureC: [10], windMph: [7], rainChancePercent: [20] },
  });
  const [h] = aggregateHours(f);
  assert.equal(h?.temperatureC.providerCount, 2);
  assert.equal(h?.wind.providerCount, 2);
  assert.equal(h?.rainChancePercent.providerCount, 1);
  assert.equal(h?.rainChancePercent.value, 20);
});

test("no contributors gives null with count 0, never 0", () => {
  const [h] = aggregateHours(forecastOf(1, {}));
  assert.deepEqual(
    [h?.temperatureC.value, h?.rainChancePercent.value, h?.wind.mph, h?.wind.kmh],
    [null, null, null, null],
  );
  assert.deepEqual(
    [h?.temperatureC.providerCount, h?.rainChancePercent.providerCount, h?.wind.providerCount],
    [0, 0, 0],
  );
});

test("a real 0 is kept as 0 and counted (0% rain is data, not a gap)", () => {
  const [h] = aggregateHours(forecastOf(1, { ukmo: { rainChancePercent: [0], windMph: [0] } }));
  assert.equal(h?.rainChancePercent.value, 0);
  assert.equal(h?.rainChancePercent.providerCount, 1);
  assert.equal(h?.wind.mph, 0);
  assert.equal(h?.wind.kmh, 0);
});

test("wind km/h is the aggregate mph times 1.609344", () => {
  const f = forecastOf(1, {
    ukmo: { windMph: [3] },
    ecmwf: { windMph: [10] },
    icon: { windMph: [40] },
  });
  const [h] = aggregateHours(f);
  assert.equal(h?.wind.mph, 10);
  assert.ok(Math.abs((h?.wind.kmh ?? NaN) - 16.09344) < 1e-9, `got ${h?.wind.kmh}`);
});
