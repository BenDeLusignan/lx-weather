import type { Light } from "@/forecast/blocks";
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

/** Wind in mph alone, for the small hour box (Product rule 4's one exception to showing both units). `null` is no data. */
export function formatWindMph(mph: number | null): string {
  return mph === null ? "no data" : `${round(mph, 0)} mph`;
}

/** The hour box's stand-in for a figure it has no data for, in the same place the number would be. */
export const NO_DATA_MARK = "–";

/**
 * What a screen reader hears for the box's two figures: "mph" and "%" are
 * often read as letters or dropped, so the words are spelled out.
 */
export function spokenRainChance(percent: number | null): string {
  return percent === null ? "rain, no data" : `rain ${round(percent, 0)} percent`;
}

export function spokenWindSpeed(mph: number | null): string {
  return mph === null ? "wind, no data" : `wind ${round(mph, 0)} miles per hour`;
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
 * The most hour blocks that stay on one row of the strip on a phone. Up to
 * this many the strip is one row; more than this and it takes two rows, split
 * evenly (see `stripColumns`). The `6` fallbacks for `--columns-phone` in
 * day-strip.module.css and loading.module.css are the same number (the strip
 * always sets the variable; the fallback is only for a missing one).
 */
export const HOURS_PER_PHONE_ROW = 6;

/**
 * The strip's column counts for `hourCount` chosen hours. On a phone: one row
 * for up to six hours, otherwise two rows of `ceil(hourCount / 2)` columns, so
 * the rows balance (7 is 4 + 3, 9 is 5 + 4, 11 is 6 + 5) and never leave one
 * orphan cell; all twelve are 6 + 6. On a wide screen: one row. Fewer chosen
 * hours get fewer, wider columns instead of a row of empty ones. Set as CSS
 * variables on the strip.
 */
export function stripColumns(hourCount: number): { phone: number; wide: number } {
  const phone = hourCount <= HOURS_PER_PHONE_ROW ? hourCount : Math.ceil(hourCount / 2);
  return { phone, wide: hourCount };
}

/**
 * The grid column (1-based) of a block in its day's strip, on a phone and on a
 * wide screen (one row), from `position`: the block's place, from 0, among the
 * user's `hourCount` chosen hours. Setting it per block keeps every chosen
 * hour in the same column on every day, even for today, whose finished hours
 * are simply not there. The phone column wraps at the same `stripColumns`
 * width the strip is built with.
 */
export function gridColumns(position: number, hourCount: number): { phone: number; wide: number } {
  return { phone: (position % stripColumns(hourCount).phone) + 1, wide: position + 1 };
}
