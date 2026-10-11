import { getCurrentUser } from "@/auth/current-user";
import { ThemeSync } from "./theme-sync";

/**
 * The logged-in user's saved theme, handed to `ThemeSync`. Reads the session,
 * so it sits behind <Suspense> in the root layout like the header and the
 * static shell is untouched. A visitor has no account: nothing is changed, so
 * the log in and sign up pages keep this device's last choice.
 */
export async function AccountTheme() {
  const user = await getCurrentUser();
  return user ? <ThemeSync theme={user.preferences.theme} /> : null;
}
