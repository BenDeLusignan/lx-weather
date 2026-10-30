/**
 * A user's own settings: the theme, and for each weekday whether they want to
 * see it and between which hours (vision, Core flow 8). Pure: no database, no
 * framework, so the rules are unit-tested and the same ones guard every write.
 *
 * Server Actions are public POST endpoints, so everything coming in is
 * `unknown` until it has been through here.
 *
 * STORAGE. Two nullable integer columns per weekday on `user`
 * (`src/db/schema.ts`: `monStart`, `monEnd` ... `sunStart`, `sunEnd`): the
 * start hour of the first block shown and of the last block shown, both block
 * start hours from 8 to 21, so 17 and 21 is 17:00 to 22:00. Both NULL is a day
 * that is switched off. CHECK constraints keep every day either off or a valid
 * range, and at least one day on, whoever writes the row.
 */

import { FIRST_BLOCK_HOUR, LAST_BLOCK_HOUR } from "@/forecast/blocks";

export const THEMES = ["system", "light", "dark"] as const;
/** `system` follows the device's own light/dark setting (the site's behaviour before this was a choice). */
export type ThemeChoice = (typeof THEMES)[number];

/** Monday first, as the Account form lists them. The index is the day's place in `Preferences.days`. */
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

/** The block start hours, 8 to 21, in order: the fourteen hours a day can show, and the slider's steps. */
export const BLOCK_HOURS: readonly number[] = Array.from(
  { length: LAST_BLOCK_HOUR - FIRST_BLOCK_HOUR + 1 },
  (_, i) => FIRST_BLOCK_HOUR + i,
);

/**
 * The hours chosen for one day, as the start hours of its first and last
 * block (both from 8 to 21, `start <= end`): `{ start: 17, end: 21 }` shows
 * the blocks 17:00 to 18:00 through 21:00 to 22:00, so "17:00 to 22:00".
 * A day is always at least one block long.
 */
export interface DayHours {
  start: number;
  end: number;
}

export interface Preferences {
  theme: ThemeChoice;
  /** One entry per weekday, Monday first (`WEEKDAYS` order). `null` is a day the user doesn't want to see. At least one is not null. */
  days: readonly (DayHours | null)[];
}

/** The whole window: what a new account gets for every day, so the screen shows everything. */
export const DEFAULT_DAY_HOURS: DayHours = { start: FIRST_BLOCK_HOUR, end: LAST_BLOCK_HOUR };

/** What a new account gets: follow the device, every day, 08:00 to 22:00. */
export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  days: WEEKDAYS.map(() => DEFAULT_DAY_HOURS),
};

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

function isBlockHour(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= FIRST_BLOCK_HOUR && value <= LAST_BLOCK_HOUR;
}

/** A start and end that are whole block hours in bounds, start first. */
export function isValidDayHours(value: unknown): value is DayHours {
  if (typeof value !== "object" || value === null) return false;
  const { start, end } = value as Partial<DayHours>;
  return isBlockHour(start) && isBlockHour(end) && start <= end;
}

/** What the write re-checks: seven entries, each off or a valid range, and not all off. */
export function isValidDays(days: readonly (DayHours | null)[]): boolean {
  return (
    days.length === WEEKDAYS.length &&
    days.every((day) => day === null || isValidDayHours(day)) &&
    days.some((day) => day !== null)
  );
}

/** The weekday's two stored columns, `monStart` and `monEnd` and so on. */
export type DayColumnKey = `${WeekdayId}Start` | `${WeekdayId}End`;

/** The row's columns for a week of days: an off day is two NULLs. */
export function daysToColumns(days: readonly (DayHours | null)[]): Record<DayColumnKey, number | null> {
  const columns = {} as Record<DayColumnKey, number | null>;
  WEEKDAYS.forEach((weekday, i) => {
    columns[`${weekday.id}Start`] = days[i]?.start ?? null;
    columns[`${weekday.id}End`] = days[i]?.end ?? null;
  });
  return columns;
}

/**
 * The week from a stored row's day columns. The CHECK constraints make a bad
 * value impossible through the app; one that got in through a raw write (or a
 * migration gone wrong) reads as the whole window for that day, and a week
 * with every day off reads as the default week, rather than crashing or
 * hiding the whole week.
 */
export function daysFromColumns(row: Record<DayColumnKey, unknown>): (DayHours | null)[] {
  const days = WEEKDAYS.map((weekday): DayHours | null => {
    const start = row[`${weekday.id}Start`];
    const end = row[`${weekday.id}End`];
    if (start === null && end === null) return null;
    return isValidDayHours({ start, end }) ? { start: start as number, end: end as number } : DEFAULT_DAY_HOURS;
  });
  return days.some((day) => day !== null) ? days : [...DEFAULT_PREFERENCES.days];
}

export function preferencesFromRow(row: { theme: unknown } & Record<DayColumnKey, unknown>): Preferences {
  return {
    theme: isThemeChoice(row.theme) ? row.theme : DEFAULT_PREFERENCES.theme,
    days: daysFromColumns(row),
  };
}

/** The name of a day's start or end slider in the Account form: `mon-start`, `mon-end`. Shared by the form and `parseDays` so they can't drift. */
export function rangeFieldName(day: WeekdayId, which: "start" | "end"): string {
  return `${day}-${which}`;
}

export type DaysParseResult =
  | { ok: true; days: (DayHours | null)[] }
  /** `no-day`: no day is ticked. `bad-times`: anything else wrong (an unknown day, a time that isn't a whole hour in bounds, a start after its end). */
  | { ok: false; reason: "no-day" | "bad-times" };

/** A form value written exactly as a block hour (`"8"`..`"21"`: no `"08"`, `" 8"`, `"8.0"`). */
function parseBlockHour(values: readonly unknown[]): number | null {
  // Exactly one value: a hand-made post with two would otherwise be read by its first.
  if (values.length !== 1) return null;
  return BLOCK_HOURS.find((hour) => String(hour) === values[0]) ?? null;
}

/**
 * The week from the Account form: the ticked days (`formData.getAll("days")`,
 * values `mon`..`sun`) and, for each ticked day, its two sliders. The sliders
 * of a day that isn't ticked are posted too (the browser sends hidden inputs)
 * and are ignored, so an unticked day never makes the post invalid. A post
 * with anything wrong is refused whole, never partly accepted. A repeated day
 * is harmless and collapses to one.
 */
export function parseDays(formData: FormData): DaysParseResult {
  const ticked = new Set<number>();
  for (const value of formData.getAll("days")) {
    const index = WEEKDAYS.findIndex((weekday) => weekday.id === value);
    if (index === -1) return { ok: false, reason: "bad-times" };
    ticked.add(index);
  }
  if (ticked.size === 0) return { ok: false, reason: "no-day" };

  const days: (DayHours | null)[] = [];
  for (const [index, weekday] of WEEKDAYS.entries()) {
    if (!ticked.has(index)) {
      days.push(null);
      continue;
    }
    const start = parseBlockHour(formData.getAll(rangeFieldName(weekday.id, "start")));
    const end = parseBlockHour(formData.getAll(rangeFieldName(weekday.id, "end")));
    if (start === null || end === null || start > end) return { ok: false, reason: "bad-times" };
    days.push({ start, end });
  }
  return { ok: true, days };
}

/** The weekday index (0 is Monday) of a UK calendar date `YYYY-MM-DD`. Noon UTC, so no zone can move it a day. */
export function weekdayIndex(date: string): number {
  const sundayFirst = new Date(`${date}T12:00:00Z`).getUTCDay();
  return (sundayFirst + 6) % 7;
}
