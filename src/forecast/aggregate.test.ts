import assert from "node:assert/strict";
import { test } from "node:test";
import { KMH_PER_MPH, aggregateRainChance, aggregateTemperature, aggregateWind } from "./aggregate";
import { by } from "./fixtures";

test("rain chance is the mean; temperature is the median (odd count)", () => {
  // The 30 is an outlier: it moves the mean, not the median.
  const rain = aggregateRainChance(by({ ukmo: 0, ecmwf: 30, icon: 90 }));
  const temp = aggregateTemperature(by({ ukmo: 10, ecmwf: 11, icon: 30 }));
  assert.equal(rain.value, 40);
  assert.equal(temp.value, 11);
  assert.equal(rain.providerCount, 3);
  assert.equal(temp.providerCount, 3);
});

test("even count: median is the mean of the two middle values", () => {
  assert.equal(aggregateWind(by({ ukmo: 4, ecmwf: 10, icon: 12, gfs: 100 })).mph, 11);
  assert.equal(aggregateTemperature(by({ ukmo: -2, ecmwf: 0, icon: 1, gfs: 20 })).value, 0.5);
});

test("a provider with no value lowers the count and is kept as a gap, not filled", () => {
  const rain = aggregateRainChance(by({ ukmo: null, ecmwf: 30 }));
  assert.equal(rain.value, 30);
  assert.equal(rain.providerCount, 1);
  assert.equal(rain.byProvider.ukmo, null);
  assert.equal(rain.byProvider.ecmwf, 30);
});

test("no contributors gives null with count 0, never 0", () => {
  const none = by({});
  const wind = aggregateWind(none);
  assert.deepEqual(
    [aggregateTemperature(none).value, aggregateRainChance(none).value, wind.mph, wind.kmh],
    [null, null, null, null],
  );
  assert.deepEqual(
    [aggregateTemperature(none).providerCount, aggregateRainChance(none).providerCount, wind.providerCount],
    [0, 0, 0],
  );
});

test("a real 0 is kept as 0 and counted (0% rain is data, not a gap)", () => {
  const rain = aggregateRainChance(by({ ukmo: 0 }));
  const wind = aggregateWind(by({ ukmo: 0 }));
  assert.equal(rain.value, 0);
  assert.equal(rain.providerCount, 1);
  assert.equal(wind.mph, 0);
  assert.equal(wind.kmh, 0);
});

test("km/h is the aggregated mph converted, not a second aggregation", () => {
  const wind = aggregateWind(by({ ukmo: 3, ecmwf: 10, icon: 40 }));
  assert.equal(wind.mph, 10);
  assert.equal(wind.kmh, 10 * KMH_PER_MPH);
  assert.equal(KMH_PER_MPH, 1.609344);
});
