export type RainLight = "green" | "yellow" | "red";

// Ben's decision (vision, Product rules 3): 30% and under is good. He changed
// only the green limit, so exactly 70 staying yellow is the team's reading
// (the red limit is still "over 70"), not Ben's words.
/** Up to and including this chance (whole %) the light is green. */
export const RAIN_GREEN_UP_TO_PERCENT = 30;
/** Over this chance (whole %) the light is red; exactly this chance is still yellow. */
export const RAIN_RED_OVER_PERCENT = 70;

/**
 * The "can we play" light for a chance of rain: 30 and under green, 31 to 70
 * inclusive yellow, over 70 red.
 *
 * The light follows the WHOLE-NUMBER % shown on screen (the team's reading),
 * so the number and the colour never disagree: 30.4 shows as 30 and is
 * green, 30.5 shows as 31 and is yellow; 70.4 shows as 70 and is yellow,
 * 70.5 shows as 71 and is red. That is why this rounds first.
 *
 * `null` (no provider gave a chance) gives `null`: never guess a colour.
 */
export function rainLight(chancePercent: number | null): RainLight | null {
  if (chancePercent === null || !Number.isFinite(chancePercent)) return null;
  const shown = Math.round(chancePercent);
  if (shown > RAIN_RED_OVER_PERCENT) return "red";
  if (shown > RAIN_GREEN_UP_TO_PERCENT) return "yellow";
  return "green";
}
