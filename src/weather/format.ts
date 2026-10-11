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

/** Both wind units together, wherever wind appears (Product rule 4). */
export function formatWind(mph: number | null, kmh: number | null): string {
  return mph === null || kmh === null ? "no data" : `${round(mph, 0)} mph / ${round(kmh, 0)} km/h`;
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
