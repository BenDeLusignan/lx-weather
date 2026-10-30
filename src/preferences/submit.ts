import "server-only";
import { updatePreferences, type User } from "@/data/users";
import { isThemeChoice, parseDays, type Preferences, type ThemeChoice } from "./preferences";

/**
 * What each settings form does with its post: where to redirect, and for the
 * theme which choice to mirror in the device's cookie. Split out from the
 * Server Actions (`actions.ts`) so tests can run them directly.
 *
 * Each form saves its own setting, so a refused one (say, every day
 * unticked) never throws away what was changed in another.
 */

export interface PreferenceResult {
  /** Where to go. A flag in the URL says what was saved or refused; never what was typed. */
  redirect: string;
  /** Set when the theme was saved: the action refreshes the device's theme cookie with it. */
  theme?: ThemeChoice;
}

/** The two places a post can end up: the saved page, and the refused page (nothing was changed). */
interface Destinations {
  saved: string;
  refused: string;
}

async function save(
  user: User | null,
  where: Destinations,
  changes: Partial<Preferences> | null,
): Promise<PreferenceResult> {
  // A visitor, sent to the landing page like the home club action.
  if (!user) return { redirect: "/" };
  if (!changes) return { redirect: where.refused };

  switch (await updatePreferences(user.id, changes)) {
    case "saved":
      return { redirect: where.saved, ...(changes.theme && { theme: changes.theme }) };
    case "invalid":
      return { redirect: where.refused };
    case "not-found":
      // The user comes from the session, so this is a stale-session edge.
      return { redirect: "/" };
  }
}

/**
 * The header's light/dark switch: one value, `theme`, from the button that was
 * pressed. The switch only offers `light` and `dark`, but `system` is a valid
 * stored value, so a hand-made post of it is saved rather than refused.
 * `returnTo` is the page the switch was used on: it has no message of its own,
 * so saved and refused both go back there (a refusal only happens for a
 * hand-made post, and changes nothing).
 */
export async function submitTheme(user: User | null, formData: FormData, returnTo: string): Promise<PreferenceResult> {
  // Exactly one value: a button posts one, so two is a hand-made request.
  const [theme, ...extra] = formData.getAll("theme");
  return save(user, { saved: returnTo, refused: returnTo }, extra.length === 0 && isThemeChoice(theme) ? { theme } : null);
}

/**
 * The Account page's days and times form: a checkbox per weekday (`days`,
 * values `mon`..`sun`) and, for a ticked day, its start and end (`mon-start`,
 * `mon-end` ...). At least one day must be ticked (`?error=days`); anything
 * else wrong, such as a start after its end or a time outside 08:00 to 22:00,
 * is `?error=times`. Either way nothing is changed.
 */
export async function submitDays(user: User | null, formData: FormData): Promise<PreferenceResult> {
  const parsed = parseDays(formData);
  if (!parsed.ok) {
    const refused = parsed.reason === "no-day" ? "/account?error=days" : "/account?error=times";
    return save(user, { saved: "/account?saved=days", refused }, null);
  }
  return save(user, { saved: "/account?saved=days", refused: "/account?error=times" }, { days: parsed.days });
}
