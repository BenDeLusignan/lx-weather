// Smoke script: npm run forecast -- <latitude> <longitude>
//            or: npm run forecast -- <club id>      (e.g. enniskillen)
// Fetches live from Open-Meteo and prints the week as days of hour blocks.
import { CLUBS } from "../src/clubs/clubs";
import { TIME_ZONE, buildWeek } from "../src/forecast/blocks";
import { ForecastFetchError, fetchHourlyForecast } from "../src/forecast/open-meteo";
import { PROVIDERS, PROVIDER_TOTAL } from "../src/forecast/providers";

function usage(): never {
  console.error("Usage: npm run forecast -- <latitude> <longitude>");
  console.error(`   or: npm run forecast -- <club id>   (${CLUBS.map((c) => c.id).join(", ")})`);
  process.exit(2);
}

function resolveLocation(args: string[]): { label: string; latitude: number; longitude: number } {
  if (args.length === 1) {
    const club = CLUBS.find((c) => c.id === args[0]?.toLowerCase());
    if (!club) usage();
    return { label: club.listedAs, latitude: club.latitude, longitude: club.longitude };
  }
  if (args.length === 2) {
    const latitude = Number(args[0]);
    const longitude = Number(args[1]);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) usage();
    return { label: `lat ${latitude}, lon ${longitude}`, latitude, longitude };
  }
  return usage();
}

// Rounding happens here, at display: whole % and mph and km/h, one decimal
// for temperature. The lights round the same way themselves.
const num = (v: number | null, digits: number): string =>
  v === null ? "-" : (Math.round(v * 10 ** digits) / 10 ** digits).toFixed(digits);
const countOfTotal = (n: number): string => `${n}/${PROVIDER_TOTAL}`;

const dayHeading = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

function table(header: string[], rows: string[][]): string[] {
  const widths = header.map((h, c) => Math.max(h.length, ...rows.map((r) => (r[c] as string).length)));
  const line = (cells: string[]): string => "  " + cells.map((c, i) => c.padEnd(widths[i] as number)).join("  ").trimEnd();
  return [line(header), ...rows.map(line)];
}

async function main(): Promise<void> {
  const { label, latitude, longitude } = resolveLocation(process.argv.slice(2));
  const forecast = await fetchHourlyForecast({ latitude, longitude });
  const week = buildWeek(forecast);

  console.log(`${label} (${latitude}, ${longitude}): one week of hour blocks, UK time`);
  console.log(`n = how many of the ${PROVIDER_TOTAL} providers each figure is built from (temp/rain/wind)`);
  for (const day of week) {
    console.log("");
    console.log(dayHeading.format(new Date(`${day.date}T12:00:00Z`)));
    if (day.blocks.length === 0) {
      console.log("  (no blocks left today)");
      continue;
    }
    const rows = day.blocks.map((b) => {
      const pad = (h: number): string => String(h).padStart(2, "0");
      return [
        `${pad(b.startHour)}:00-${pad(b.startHour + 1)}:00`,
        num(b.temperatureC.value, 1),
        num(b.rainChancePercent.value, 0),
        b.rainLight ?? "-",
        num(b.wind.mph, 0),
        num(b.wind.kmh, 0),
        b.windLight ?? "-",
        b.light ?? "-",
        `${countOfTotal(b.temperatureC.providerCount)} ${countOfTotal(b.rainChancePercent.providerCount)} ${countOfTotal(b.wind.providerCount)}`,
      ];
    });
    for (const l of table(["block", "C", "rain%", "rain", "mph", "km/h", "wind", "LIGHT", "n"], rows)) {
      console.log(l);
    }
  }

  const labels = new Map<string, string>(PROVIDERS.map((p) => [p.id, p.label]));
  console.log("");
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
