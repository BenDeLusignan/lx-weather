// Smoke script: npm run forecast -- <latitude> <longitude>
// Fetches live from Open-Meteo and prints the next 24 hours as a table.
import { aggregateHours } from "../src/forecast/aggregate";
import { ForecastFetchError, fetchHourlyForecast } from "../src/forecast/open-meteo";
import { PROVIDERS, PROVIDER_TOTAL } from "../src/forecast/providers";
import { rainLight } from "../src/forecast/rain-light";

const HOURS = 24;

async function main(): Promise<void> {
  const [latArg, lonArg] = process.argv.slice(2);
  const latitude = Number(latArg);
  const longitude = Number(lonArg);
  if (!latArg || !lonArg || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    console.error("Usage: npm run forecast -- <latitude> <longitude>");
    process.exitCode = 2;
    return;
  }

  const forecast = await fetchHourlyForecast({ latitude, longitude });
  const hours = aggregateHours(forecast);

  // The series starts at local midnight today; show from the current hour on.
  const hourStart = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const upcoming = hours.filter((h) => Date.parse(h.time) >= hourStart).slice(0, HOURS);

  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  // Rounding happens here, at display (rainLight rounds the same way itself,
  // so the number shown and the colour agree).
  const num = (v: number | null, digits: number): string =>
    v === null ? "-" : (Math.round(v * 10 ** digits) / 10 ** digits).toFixed(digits);
  const of = (n: number): string => `${n} of ${PROVIDER_TOTAL}`;

  const rows = upcoming.map((h) => {
    const rain = h.rainChancePercent.value === null ? null : Math.round(h.rainChancePercent.value);
    return [
      clock.format(new Date(h.time)),
      num(h.temperatureC.value, 1),
      of(h.temperatureC.providerCount),
      rain === null ? "-" : String(rain),
      rainLight(h.rainChancePercent.value) ?? "-",
      of(h.rainChancePercent.providerCount),
      num(h.wind.mph, 0),
      num(h.wind.kmh, 0),
      of(h.wind.providerCount),
    ];
  });
  const header = ["time", "temp C", "temp n", "rain %", "light", "rain n", "mph", "km/h", "wind n"];
  const widths = header.map((h, c) => Math.max(h.length, ...rows.map((r) => (r[c] as string).length)));
  const line = (cells: string[]): string => cells.map((c, i) => c.padEnd(widths[i] as number)).join("  ");
  console.log(`Lat ${latitude}, lon ${longitude}: next ${rows.length} hours, five providers combined`);
  console.log(line(header));
  for (const r of rows) console.log(line(r));

  const labels = new Map<string, string>(PROVIDERS.map((p) => [p.id, p.label]));
  console.log(
    forecast.unavailable.length === 0
      ? "Unavailable providers: none"
      : `Unavailable providers: ${forecast.unavailable.map((id) => labels.get(id)).join(", ")}`,
  );
  console.log("Weather data by Open-Meteo.com (CC BY 4.0)");
}

main().catch((error: unknown) => {
  if (error instanceof ForecastFetchError) {
    console.error(`No forecast: ${error.message}`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
