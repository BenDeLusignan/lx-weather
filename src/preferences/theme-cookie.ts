import "server-only";
import { cookies } from "next/headers";
import type { ThemeChoice } from "./preferences";
import { THEME_COOKIE, THEME_COOKIE_SECONDS } from "./theme";

/**
 * Keeps this device's theme cookie in step with the account's choice (why a
 * cookie at all: `theme.ts`). `system` removes it. Only from a Server Action
 * or Route Handler: cookies can't be set while rendering.
 */
export async function setThemeCookie(theme: ThemeChoice): Promise<void> {
  const jar = await cookies();
  if (theme === "system") {
    jar.delete(THEME_COOKIE);
    return;
  }
  jar.set(THEME_COOKIE, theme, {
    // Not HttpOnly: the inline script in <head> reads it. It holds only "light" or "dark".
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THEME_COOKIE_SECONDS,
  });
}
