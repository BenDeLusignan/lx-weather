import { FIRST_BLOCK_HOUR, type Light } from "@/forecast/blocks";
import { PROVIDER_TOTAL } from "@/forecast/providers";

/**
 * Display rounding, done once here at the edge (the engine rounds nothing;
 * vision, Current state): whole % and whole mph and km/h, one decimal for
 * degrees C. The lights already follow the whole numbers.
 */

function round(value: number, digits: number): string {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  // -0.04 rounds to -0, which prints as "-0.0": a temperature of nothing has no sign.
  return (Object.is(rounded, -0) ? 0 : rounded).toFixed(digits);
}

export function formatTemperature(celsius: number | null): string {
  return celsius === null ? "no data" : `${round(celsius, 1)} °C`;
}

export function formatRainChance(percent: number | null): string {
  return percent === null ? "no data" : `${round(percent, 0)}%`;
}

/**
 * Both wind units together, wherever wind appears (Product rule 4), as the
 * two parts so a narrow table can put one under the other. `null` is no data.
 */
export function formatWindParts(mph: number | null, kmh: number | null): { mph: string; kmh: string } | null {
  return mph === null || kmh === null ? null : { mph: `${round(mph, 0)} mph`, kmh: `${round(kmh, 0)} km/h` };
}

export function formatWind(mph: number | null, kmh: number | null): string {
  const parts = formatWindParts(mph, kmh);
  return parts ? `${parts.mph} / ${parts.kmh}` : "no data";
}

/** "4 of 5 providers", only when fewer than all five contributed (Team convention 1); otherwise null. */
export function providerCountNote(count: number): string | null {
  return count > 0 && count < PROVIDER_TOTAL ? `${count} of ${PROVIDER_TOTAL} providers` : null;
}

/** `8` becomes `08:00`. */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

const dayHeading = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** `2026-10-12` becomes "Monday 12 October". The date is a calendar date, so UTC noon can't slip a day. */
export function formatDayHeading(date: string): string {
  return dayHeading.format(new Date(`${date}T12:00:00Z`));
}

/** "Today", "Tomorrow", or null for the days after: `index` is the day's place in the week (0 is today). */
export function relativeDayName(index: number): string | null {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return null;
}

/** `9` becomes `09:00–10:00`: a block is one hour. */
export function timeRange(startHour: number): string {
  return `${hourLabel(startHour)}–${hourLabel(startHour + 1)}`;
}

/** The traffic light in words, so colour is never the only cue (Core flow 3). `null` is a block that can't be judged. */
export function lightWord(light: Light | null): "Good" | "Passable" | "Unlikely" | "Unknown" {
  switch (light) {
    case "green":
      return "Good";
    case "yellow":
      return "Passable";
    case "red":
      return "Unlikely";
    case null:
      return "Unknown";
  }
}

/** What each light means, in Ben's words (Core flow 3). */
export function lightMeaning(light: Light | null): string {
  switch (light) {
    case "green":
      return "A good chance of no rain or wind.";
    case "yellow":
      return "A passable level of play.";
    case "red":
      return "Very unlikely you will get to play.";
    case null:
      return "Not enough data to judge.";
  }
}

/**
 * Why a light is unknown: the figure that couldn't be judged. Never guessed
 * (Ben's decision 2). Only meaningful for a block whose light is `null`: a
 * red rain or wind light makes the block red even if the other is missing.
 */
export function unknownReason(block: { rainLight: unknown; windLight: unknown }): string {
  if (block.rainLight === null && block.windLight === null) return "no rain or wind data";
  return block.windLight === null ? "no wind data" : "no rain data";
}

/**
 * How many hour blocks fit across one row of the strip on a phone. The same 6
 * is in `grid-template-columns` in day-strip.module.css (and loading.module.css);
 * change them together.
 */
export const HOURS_PER_PHONE_ROW = 6;

/**
 * The grid column (1-based) of a block in its day's strip, on a phone (two
 * rows of six: 08:00 to 13:00, then 14:00 to 19:00) and on a wide screen (one
 * row of twelve). Setting it per block keeps every hour in the same column on
 * every day, even for today, whose finished hours are simply not there.
 */
export function gridColumns(startHour: number): { phone: number; wide: number } {
  const index = startHour - FIRST_BLOCK_HOUR;
  return { phone: (index % HOURS_PER_PHONE_ROW) + 1, wide: index + 1 };
}
