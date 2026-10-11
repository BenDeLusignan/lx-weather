export type WindLight = "green" | "yellow" | "red";

// The team's pick, pending Ben's confirmation (vision, Team convention 4 and
// Open questions). Ben only said a strong wind makes the game unplayable; he
// did not give speeds. Change them here and in the vision together.
/** From this speed (whole mph) the light is yellow. */
export const WIND_YELLOW_FROM_MPH = 10;
/** Over this speed (whole mph) the light is red; exactly this speed is still yellow. */
export const WIND_RED_OVER_MPH = 15;

/**
 * The light for a wind speed in mph: under 10 green, 10 to 15 inclusive
 * yellow, over 15 red. Like the rain light it follows the whole-number mph
 * shown on screen (9.4 shows 9 and is green, 9.5 shows 10 and is yellow;
 * 15.4 is yellow, 15.5 shows 16 and is red).
 *
 * `null` (no provider gave a wind speed) gives `null`: never guess a colour.
 */
export function windLight(mph: number | null): WindLight | null {
  if (mph === null || !Number.isFinite(mph)) return null;
  const shown = Math.round(mph);
  if (shown > WIND_RED_OVER_MPH) return "red";
  if (shown >= WIND_YELLOW_FROM_MPH) return "yellow";
  return "green";
}
