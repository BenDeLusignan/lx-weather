import "server-only";
import { updatePreferences, type User } from "@/data/users";
import { isThemeChoice, parseDays, parseHours, type Preferences, type ThemeChoice } from "./preferences";

/**
 * What each Account settings form does with its post: where to redirect, and
 * for the theme which choice to mirror in the device's cookie. Split out from
 * the Server Actions (`actions.ts`) so tests can run them directly.
 *
 * Each form saves its own setting, so a refused one (say, every day
 * unchecked) never throws away what was changed in another.
 */

export type PreferenceSection = "theme" | "days" | "hours";

export interface PreferenceResult {
  /** Where to go. A flag in the URL says what was saved or refused; never what was typed. */
  redirect: string;
  /** Set when the theme was saved: the action refreshes the device's theme cookie with it. */
  theme?: ThemeChoice;
}

const refused = (section: PreferenceSection): PreferenceResult => ({ redirect: `/account?error=${section}` });

async function save(
  user: User | null,
  section: PreferenceSection,
  changes: Partial<Preferences> | null,
): Promise<PreferenceResult> {
  // A visitor, sent to the landing page like the home club action.
  if (!user) return { redirect: "/" };
  if (!changes) return refused(section);

  switch (await updatePreferences(user.id, changes)) {
    case "saved":
      return { redirect: `/account?saved=${section}`, ...(changes.theme && { theme: changes.theme }) };
    case "invalid":
      return refused(section);
    case "not-found":
      // The user comes from the session, so this is a stale-session edge.
      return { redirect: "/" };
  }
}

/** One radio group, `theme`: `system`, `light` or `dark`. */
export async function submitTheme(user: User | null, formData: FormData): Promise<PreferenceResult> {
  // Exactly one value: a radio group posts one, so two is a hand-made request.
  const [theme, ...extra] = formData.getAll("theme");
  return save(user, "theme", extra.length === 0 && isThemeChoice(theme) ? { theme } : null);
}

/** Checkboxes named `days`, values `mon`..`sun`; at least one. */
export async function submitDays(user: User | null, formData: FormData): Promise<PreferenceResult> {
  const days = parseDays(formData.getAll("days"));
  return save(user, "days", days && { days });
}

/** Checkboxes named `hours`, values `10`..`21`; at least one. */
export async function submitHours(user: User | null, formData: FormData): Promise<PreferenceResult> {
  const hours = parseHours(formData.getAll("hours"));
  return save(user, "hours", hours && { hours });
}
