import type { Block, Day } from "@/forecast/blocks";
import { WEEKDAYS, weekdayIndex, type Preferences } from "./preferences";

/**
 * A user's days and hours applied to the week the forecast engine built
 * (vision, Core flow 8). It is done here, on the way to the screen, and not
 * in `buildWeek`: the engine stays one pure function of the forecast and the
 * clock, and the same week serves every user.
 */

export interface ShownDay {
  day: Day;
  /** The day's place in the whole week (0 is today), so "Today" and "Tomorrow" still name the right days. */
  index: number;
  /** The day's blocks that are in that weekday's chosen hours, in order. Empty for a chosen day with no chosen hour left (today). */
  blocks: Block[];
}

/**
 * Keeps the chosen weekdays and, within each, its own chosen hours. Nothing
 * is made up: a day the user switched off is dropped, a block outside that
 * day's start and end is dropped, and a chosen day with no chosen hour left
 * (today, once its chosen blocks are over) stays with no blocks, so the
 * screen can say so.
 */
export function filterWeek(week: readonly Day[], preferences: Pick<Preferences, "days">): ShownDay[] {
  const shown: ShownDay[] = [];
  week.forEach((day, index) => {
    const hours = preferences.days[weekdayIndex(day.date)];
    if (!hours) return;
    shown.push({
      day,
      index,
      blocks: day.blocks.filter((block) => block.startHour >= hours.start && block.startHour <= hours.end),
    });
  });
  return shown;
}

/**
 * How many hour boxes each shown day will have, in the week's order starting
 * from the weekday `todayIndex` (0 is Monday): the shape of the week before the
 * forecast arrives, for the loading skeleton. A full day, not today's
 * remainder: the clock isn't read here, and the skeleton only needs to look
 * like the week.
 */
export function shownHourCounts(preferences: Pick<Preferences, "days">, todayIndex: number): number[] {
  const counts: number[] = [];
  for (let offset = 0; offset < WEEKDAYS.length; offset++) {
    const hours = preferences.days[(todayIndex + offset) % WEEKDAYS.length];
    if (hours) counts.push(hours.end - hours.start + 1);
  }
  return counts;
}
