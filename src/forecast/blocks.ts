// The week view's data: days of hour blocks, each with its aggregated figures,
// lights and source data (vision, Core flow 1 and 2, and Product rule 3).
//
// The team's readings of Ben's words, all in the vision: the week is today plus
// the next six days; a block is one hour, 10:00-11:00 to 21:00-22:00 (twelve a
// day); blocks of today that are already over are omitted; every date and hour
// is UK time (Europe/London).
//
// WHICH HOURLY STAMPS FEED A BLOCK. Open-Meteo stamps hourly values with the
// END of what they describe for rain and the INSTANT for the rest (its docs:
// `precipitation_probability` is the "preceding hour probability", so the
// 11:00 value covers 10:00-11:00; `temperature_2m` and `wind_speed_10m` are
// "instant" at the stamp). So for the block 10:00-11:00, per provider:
//   - rain chance: the 11:00 stamp (the one that describes exactly that hour);
//   - temperature and wind: the mean of the 10:00 and 11:00 stamps (the
//     instants at the block's start and end), computed per provider BEFORE the
//     providers are combined, and only when both stamps have a value. A
//     provider with one of the two missing gives nothing for that figure; the
//     other stamp is not used on its own (that would be filling a gap).
// Every figure therefore needs the 11:00 stamp, so a provider that runs out
// at 11:00 still covers the 10:00-11:00 block and no block is lost by taking
// the mean. The last block, 21:00-22:00, needs the 22:00 stamp, which the
// forecast always holds: it is fetched as whole UK days (see open-meteo.ts).
//
// Time zone: the stamps are UTC instants; a block's local date and hour come
// from Intl with Europe/London, never a fixed offset, so a clock change inside
// the week is handled (a 25-hour day still has exactly twelve blocks).

import {
  aggregateRainChance,
  aggregateTemperature,
  aggregateWind,
  type ByProvider,
  type FigureAggregate,
  type WindAggregate,
} from "./aggregate";
import type { HourlyForecast } from "./open-meteo";
import { PROVIDERS } from "./providers";
import { rainLight, type RainLight } from "./rain-light";
import { windLight, type WindLight } from "./wind-light";

export const TIME_ZONE = "Europe/London";
export const FIRST_BLOCK_HOUR = 10;
/** The last block starts at 21:00 and ends at 22:00. */
export const LAST_BLOCK_HOUR = 21;
export const WEEK_DAYS = 7;

const HOUR_MS = 3_600_000;

export type Light = "green" | "yellow" | "red";

export interface Block {
  /** Start of the block as a UTC instant (ISO 8601). */
  start: string;
  /** UK local date of the block, `YYYY-MM-DD`. */
  date: string;
  /** UK local start hour, 10 to 21 (the block is `startHour`:00 to `startHour + 1`:00). */
  startHour: number;
  temperatureC: FigureAggregate;
  rainChancePercent: FigureAggregate;
  wind: WindAggregate;
  rainLight: RainLight | null;
  windLight: WindLight | null;
  /** The worse of the two lights, `null` unless both can be judged or one is red (see `combineLights`). */
  light: Light | null;
}

export interface Day {
  /** UK local date, `YYYY-MM-DD`. */
  date: string;
  /** Twelve blocks, fewer for today once some are over (none after 22:00). */
  blocks: Block[];
}

/**
 * A block's light is the worse of its rain and wind lights (Product rule 3).
 * An unknown is never guessed: if either is red the block is red whatever the
 * other is; otherwise, if either is unknown, the block is unknown (`null`);
 * otherwise yellow if either is yellow; otherwise green.
 */
export function combineLights(rain: Light | null, wind: Light | null): Light | null {
  if (rain === "red" || wind === "red") return "red";
  if (rain === null || wind === null) return null;
  if (rain === "yellow" || wind === "yellow") return "yellow";
  return "green";
}

export interface BuildWeekOptions {
  /** The current moment; injected in tests. */
  now?: Date;
}

/**
 * Today and the next six days (UK dates) as days of hour blocks. A block with
 * no data is still returned, with `null` figures and a `null` light, so the
 * UI can say so; nothing is dropped or invented. If the forecast does not
 * reach that far, the later days are simply empty blocks.
 */
export function buildWeek(forecast: HourlyForecast, options: BuildWeekOptions = {}): Day[] {
  const nowMs = (options.now ?? new Date()).getTime();
  const indexByTime = new Map<number, number>(
    forecast.times.map((t, i) => [Date.parse(t), i] as const),
  );

  const days: Day[] = [];
  const today = londonParts(nowMs).date;
  for (let d = 0; d < WEEK_DAYS; d++) {
    const date = addDays(today, d);
    const blocks: Block[] = [];
    for (let hour = FIRST_BLOCK_HOUR; hour <= LAST_BLOCK_HOUR; hour++) {
      const startMs = londonToUtcMs(date, hour);
      if (startMs + HOUR_MS <= nowMs) continue; // already over
      blocks.push(buildBlock(forecast, indexByTime, startMs, date, hour));
    }
    days.push({ date, blocks });
  }
  return days;
}

function buildBlock(
  forecast: HourlyForecast,
  indexByTime: ReadonlyMap<number, number>,
  startMs: number,
  date: string,
  startHour: number,
): Block {
  const startIndex = indexByTime.get(startMs);
  const endIndex = indexByTime.get(startMs + HOUR_MS);

  const temperature = {} as ByProvider;
  const rain = {} as ByProvider;
  const wind = {} as ByProvider;
  for (const { id } of PROVIDERS) {
    const s = forecast.series[id];
    temperature[id] = meanOfBothStamps(s.temperatureC, startIndex, endIndex);
    wind[id] = meanOfBothStamps(s.windMph, startIndex, endIndex);
    rain[id] = endIndex === undefined ? null : (s.rainChancePercent[endIndex] ?? null);
  }

  const windFigure = aggregateWind(wind);
  const rainFigure = aggregateRainChance(rain);
  const rl = rainLight(rainFigure.value);
  const wl = windLight(windFigure.mph);
  return {
    start: new Date(startMs).toISOString(),
    date,
    startHour,
    temperatureC: aggregateTemperature(temperature),
    rainChancePercent: rainFigure,
    wind: windFigure,
    rainLight: rl,
    windLight: wl,
    light: combineLights(rl, wl),
  };
}

function meanOfBothStamps(
  column: readonly (number | null)[],
  startIndex: number | undefined,
  endIndex: number | undefined,
): number | null {
  if (startIndex === undefined || endIndex === undefined) return null;
  const a = column[startIndex];
  const b = column[endIndex];
  if (a === null || a === undefined || b === null || b === undefined) return null;
  return (a + b) / 2;
}

const londonFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
});

/** UK local date (`YYYY-MM-DD`) and hour (0-23) of a UTC instant. */
function londonParts(ms: number): { date: string; hour: number } {
  const p: Record<string, string> = {};
  for (const part of londonFormat.formatToParts(ms)) p[part.type] = part.value;
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}

/** The UTC instant of `hour`:00 UK time on `date`. Only for hours that exist once (10-21 always do). */
function londonToUtcMs(date: string, hour: number): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const asIfUtc = Date.UTC(y, m - 1, d, hour);
  // London is UTC+0 (GMT) or UTC+1 (BST); take the offset whose local time matches.
  for (const offsetHours of [0, 1]) {
    const candidate = asIfUtc - offsetHours * HOUR_MS;
    const local = londonParts(candidate);
    if (local.date === date && local.hour === hour) return candidate;
  }
  throw new Error(`No such UK time: ${date} ${hour}:00`);
}

/** Calendar arithmetic on a `YYYY-MM-DD` date (no clock involved, so no DST). */
function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
