import type { Block, Day } from "@/forecast/blocks";
import { weekdayIndex, type Preferences } from "./preferences";

/**
 * A user's days and hours applied to the week the forecast engine built
 * (vision, Core flow 6). It is done here, on the way to the screen, and not
 * in `buildWeek`: the engine stays one pure function of the forecast and the
 * clock, and the same week serves every user.
 */

export interface ShownDay {
  day: Day;
  /** The day's place in the whole week (0 is today), so "Today" and "Tomorrow" still name the right days. */
  index: number;
  /** The day's blocks that are in the user's chosen hours, in order. Empty for a chosen day with no chosen hour left (today). */
  blocks: Block[];
}

/**
 * Keeps the chosen weekdays and, within them, the chosen hours. Nothing is
 * made up: a day the user switched off is dropped, a block outside their
 * hours is dropped, and a chosen day with no chosen hour left (today, once
 * its chosen blocks are over) stays with no blocks, so the screen can say so.
 */
export function filterWeek(week: readonly Day[], preferences: Pick<Preferences, "days" | "hours">): ShownDay[] {
  const shown: ShownDay[] = [];
  week.forEach((day, index) => {
    if (!preferences.days.includes(weekdayIndex(day.date))) return;
    shown.push({ day, index, blocks: day.blocks.filter((block) => preferences.hours.includes(block.startHour)) });
  });
  return shown;
}
