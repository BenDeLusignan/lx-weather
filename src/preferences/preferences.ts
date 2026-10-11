/**
 * A user's own settings: the theme, and which days and hours of the week
 * they want to see (vision, Core flow 6 and 7). Pure: no database, no
 * framework, so the rules are unit-tested and the same ones guard every write.
 *
 * Server Actions are public POST endpoints, so everything coming in is
 * `unknown` until it has been through here.
 *
 * STORAGE. Days and hours are small bitmasks in an integer column each
 * (`src/db/schema.ts`), with CHECK constraints keeping them non-empty and in
 * range: a set can't be stored empty or with a stray bit, whoever writes it.
 *   - days:  bit 0 is Monday ... bit 6 is Sunday (`WEEKDAYS` order); all = 127
 *   - hours: bit 0 is the block starting at 10:00 ... bit 11 the one at 21:00; all = 4095
 */

import { FIRST_BLOCK_HOUR, LAST_BLOCK_HOUR } from "@/forecast/blocks";

export const THEMES = ["system", "light", "dark"] as const;
/** `system` follows the device's own light/dark setting (the site's behaviour before this was a choice). */
export type ThemeChoice = (typeof THEMES)[number];

/** Monday first, as the Account form lists them. The index is the day's bit. */
export const WEEKDAYS = [
  { id: "mon", label: "Monday" },
  { id: "tue", label: "Tuesday" },
  { id: "wed", label: "Wednesday" },
  { id: "thu", label: "Thursday" },
  { id: "fri", label: "Friday" },
  { id: "sat", label: "Saturday" },
  { id: "sun", label: "Sunday" },
] as const;
export type WeekdayId = (typeof WEEKDAYS)[number]["id"];

/** The block start hours, 10 to 21, in order: the twelve hours a day shows. */
export const BLOCK_HOURS: readonly number[] = Array.from(
  { length: LAST_BLOCK_HOUR - FIRST_BLOCK_HOUR + 1 },
  (_, i) => FIRST_BLOCK_HOUR + i,
);

export const ALL_DAYS_MASK = (1 << WEEKDAYS.length) - 1;
export const ALL_HOURS_MASK = (1 << BLOCK_HOURS.length) - 1;

export interface Preferences {
  theme: ThemeChoice;
  /** Indexes into `WEEKDAYS` (0 is Monday), ascending, no duplicates, never empty. */
  days: readonly number[];
  /** Block start hours (10 to 21), ascending, no duplicates, never empty. */
  hours: readonly number[];
}

/** What a new account gets, and what a row from before these settings reads as: no change to the site. */
export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  days: WEEKDAYS.map((_, i) => i),
  hours: BLOCK_HOURS,
};

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

function maskToList(mask: number, size: number): number[] {
  const list: number[] = [];
  for (let bit = 0; bit < size; bit++) if (mask & (1 << bit)) list.push(bit);
  return list;
}

function listToMask(list: readonly number[]): number {
  return list.reduce((mask, bit) => mask | (1 << bit), 0);
}

function isMask(value: unknown, all: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= all;
}

export function daysToMask(days: readonly number[]): number {
  return listToMask(days);
}

export function hoursToMask(hours: readonly number[]): number {
  return listToMask(hours.map((hour) => hour - FIRST_BLOCK_HOUR));
}

/**
 * A stored row as preferences. The CHECK constraints make a bad value
 * impossible through the app; a value that got in through a raw write (or a
 * migration gone wrong) reads as the default for that setting rather than
 * crashing or hiding the whole week.
 */
export function preferencesFromRow(row: { theme: unknown; days: unknown; hours: unknown }): Preferences {
  return {
    theme: isThemeChoice(row.theme) ? row.theme : DEFAULT_PREFERENCES.theme,
    days: isMask(row.days, ALL_DAYS_MASK) ? maskToList(row.days, WEEKDAYS.length) : DEFAULT_PREFERENCES.days,
    hours: isMask(row.hours, ALL_HOURS_MASK)
      ? maskToList(row.hours, BLOCK_HOURS.length).map((bit) => FIRST_BLOCK_HOUR + bit)
      : DEFAULT_PREFERENCES.hours,
  };
}

/**
 * The days from a form's checked boxes (`formData.getAll("days")`, values
 * `mon`..`sun`). Null if nothing is chosen, or any value isn't a day: a
 * hand-made post is refused whole, never partly accepted. Repeats are
 * harmless and collapse to one.
 */
export function parseDays(values: readonly unknown[]): number[] | null {
  const chosen = new Set<number>();
  for (const value of values) {
    const index = WEEKDAYS.findIndex((day) => day.id === value);
    if (index === -1) return null;
    chosen.add(index);
  }
  return chosen.size > 0 ? [...chosen].sort((a, b) => a - b) : null;
}

/**
 * The hours from a form's checked boxes (values `10`..`21`, written exactly
 * so: `"010"`, `" 10"`, `"10.0"` and `"22"` are refused). Same rules as `parseDays`.
 */
export function parseHours(values: readonly unknown[]): number[] | null {
  const chosen = new Set<number>();
  for (const value of values) {
    const hour = BLOCK_HOURS.find((candidate) => String(candidate) === value);
    if (hour === undefined) return null;
    chosen.add(hour);
  }
  return chosen.size > 0 ? [...chosen].sort((a, b) => a - b) : null;
}

/** Whether a list is something `parseDays` / `parseHours` would produce: what the write re-checks. */
export function isValidDays(days: readonly number[]): boolean {
  return days.length > 0 && days.every((d) => Number.isInteger(d) && d >= 0 && d < WEEKDAYS.length);
}

export function isValidHours(hours: readonly number[]): boolean {
  return hours.length > 0 && hours.every((h) => BLOCK_HOURS.includes(h));
}

/** The weekday index (0 is Monday) of a UK calendar date `YYYY-MM-DD`. Noon UTC, so no zone can move it a day. */
export function weekdayIndex(date: string): number {
  const sundayFirst = new Date(`${date}T12:00:00Z`).getUTCDay();
  return (sundayFirst + 6) % 7;
}

/** Whether these are the defaults, i.e. the week is shown unfiltered. */
export function showsEverything(preferences: Pick<Preferences, "days" | "hours">): boolean {
  return preferences.days.length === WEEKDAYS.length && preferences.hours.length === BLOCK_HOURS.length;
}
