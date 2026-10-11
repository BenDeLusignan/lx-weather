export type RainLight = "green" | "yellow" | "red";

/**
 * The "can we play" light for a chance of rain (vision, Ben's decision 3):
 * over 70% red, 40% to 70% yellow, under 40% green.
 *
 * Ben did not say which side exactly 40 and exactly 70 fall on. Both being
 * yellow is the team's reading, not Ben's words.
 *
 * `null` (no provider gave a chance) gives `null`: never guess a colour.
 *
 * The chance is rounded to a whole % first, exactly as it is shown to the user,
 * so the number on screen and the colour can never disagree (70.4 shows as
 * "70%" and is yellow; 70.5 shows as "71%" and is red). Callers pass the
 * unrounded figure and need not round for the light.
 */
export function rainLight(chancePercent: number | null): RainLight | null {
  if (chancePercent === null || !Number.isFinite(chancePercent)) return null;
  const shown = Math.round(chancePercent);
  if (shown > 70) return "red";
  if (shown >= 40) return "yellow";
  return "green";
}
