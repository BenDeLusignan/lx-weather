import assert from "node:assert/strict";
import { test } from "node:test";
import { ForecastFetchError, fetchHourlyForecast } from "./open-meteo";
import { fakeFetch, openMeteoBody } from "./fixtures";

const point = { latitude: 1, longitude: 2 };

test("asks for the five models, in mph, with unix times (the parser relies on all three)", async () => {
  let requested: URL | undefined;
  const fetchImpl: typeof fetch = async (input) => {
    requested = new URL(String(input));
    return new Response(JSON.stringify(openMeteoBody(1, { temperature_2m_ukmo_seamless: [1] })));
  };
  await fetchHourlyForecast({ latitude: 54.6, longitude: -5.9, fetchImpl });
  const q = requested?.searchParams;
  assert.equal(q?.get("models"), "ukmo_seamless,ecmwf_ifs025,icon_seamless,gfs_seamless,gem_seamless");
  assert.equal(q?.get("wind_speed_unit"), "mph");
  assert.equal(q?.get("timeformat"), "unixtime");
  assert.equal(q?.get("latitude"), "54.6");
  assert.equal(q?.get("longitude"), "-5.9");
});

async function rejection(promise: Promise<unknown>): Promise<ForecastFetchError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof ForecastFetchError, `expected ForecastFetchError, got ${String(error)}`);
    return error;
  }
  assert.fail("expected the fetch to throw");
}

test("reads per-model suffixed columns, keeps nulls, converts times to UTC instants", async () => {
  const body = openMeteoBody(3, {
    temperature_2m_ukmo_seamless: [9.5, 9, null],
    precipitation_probability_ukmo_seamless: [0, null, null],
    wind_speed_10m_ukmo_seamless: [6, 7, null],
    temperature_2m_gem_seamless: [10, 11, 12],
    precipitation_probability_gem_seamless: [5, 6, 7],
    wind_speed_10m_gem_seamless: [1, 2, 3],
  });
  const f = await fetchHourlyForecast({ ...point, fetchImpl: fakeFetch(JSON.stringify(body)) });
  assert.deepEqual(f.times, [
    "2026-10-11T00:00:00.000Z",
    "2026-10-11T01:00:00.000Z",
    "2026-10-11T02:00:00.000Z",
  ]);
  assert.deepEqual(f.series.ukmo.temperatureC, [9.5, 9, null]);
  assert.deepEqual(f.series.ukmo.rainChancePercent, [0, null, null]);
  assert.deepEqual(f.series.gem.windMph, [1, 2, 3]);
});

test("a provider with every figure null is unavailable, and is not turned into zeros", async () => {
  const body = openMeteoBody(2, {
    temperature_2m_ukmo_seamless: [9, 8],
    precipitation_probability_ukmo_seamless: [1, 2],
    wind_speed_10m_ukmo_seamless: [3, 4],
    // ICON came back with columns that are entirely null.
    temperature_2m_icon_seamless: [null, null],
    precipitation_probability_icon_seamless: [null, null],
    wind_speed_10m_icon_seamless: [null, null],
    // ECMWF columns missing altogether.
  });
  const f = await fetchHourlyForecast({ ...point, fetchImpl: fakeFetch(JSON.stringify(body)) });
  assert.deepEqual(f.unavailable.sort(), ["ecmwf", "gem", "gfs", "icon"]);
  assert.deepEqual(f.series.icon.temperatureC, [null, null]);
  assert.deepEqual(f.series.ecmwf.windMph, [null, null]);
});

test("a provider with some data (e.g. no rain chance) is still available", async () => {
  const body = openMeteoBody(1, {
    temperature_2m_ukmo_seamless: [9],
    wind_speed_10m_ukmo_seamless: [3],
    precipitation_probability_ukmo_seamless: [null],
  });
  const f = await fetchHourlyForecast({ ...point, fetchImpl: fakeFetch(JSON.stringify(body)) });
  assert.ok(!f.unavailable.includes("ukmo"));
});

test("Open-Meteo { error: true } throws with its reason", async () => {
  const error = await rejection(
    fetchHourlyForecast({
      ...point,
      fetchImpl: fakeFetch(JSON.stringify({ error: true, reason: "Too many requests" }), { status: 429 }),
    }),
  );
  assert.equal(error.kind, "api");
  assert.equal(error.status, 429);
  assert.match(error.message, /Too many requests/);
});

test("HTTP error with a non-JSON body throws", async () => {
  const error = await rejection(
    fetchHourlyForecast({
      ...point,
      fetchImpl: fakeFetch("<html>Bad gateway</html>", { status: 502, statusText: "Bad Gateway" }),
    }),
  );
  assert.equal(error.kind, "http");
  assert.equal(error.status, 502);
  assert.match(error.message, /502/);
});

test("a 200 that is not JSON throws", async () => {
  const error = await rejection(fetchHourlyForecast({ ...point, fetchImpl: fakeFetch("not json") }));
  assert.equal(error.kind, "invalid-response");
});

test("JSON of the wrong shape throws instead of reporting an empty forecast", async () => {
  for (const body of [{}, { hourly: {} }, openMeteoBody(2, { unrelated: [1, 2] })]) {
    const error = await rejection(
      fetchHourlyForecast({ ...point, fetchImpl: fakeFetch(JSON.stringify(body)) }),
    );
    assert.equal(error.kind, "invalid-response");
  }
});

test("a column whose length does not match the times throws", async () => {
  const body = openMeteoBody(3, { temperature_2m_ukmo_seamless: [1, 2] });
  const error = await rejection(fetchHourlyForecast({ ...point, fetchImpl: fakeFetch(JSON.stringify(body)) }));
  assert.equal(error.kind, "invalid-response");
});

test("a network failure throws", async () => {
  const error = await rejection(
    fetchHourlyForecast({
      ...point,
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    }),
  );
  assert.equal(error.kind, "network");
  assert.match(error.message, /fetch failed/);
});

test("coordinates and days out of range are rejected before any request", async () => {
  const fetchImpl: typeof fetch = async () => assert.fail("must not fetch");
  await assert.rejects(fetchHourlyForecast({ latitude: 91, longitude: 0, fetchImpl }), RangeError);
  await assert.rejects(fetchHourlyForecast({ latitude: 0, longitude: NaN, fetchImpl }), RangeError);
  await assert.rejects(fetchHourlyForecast({ ...point, days: 17, fetchImpl }), RangeError);
});
