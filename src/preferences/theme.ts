/**
 * How the chosen theme reaches the page before it is painted (vision, Theme).
 *
 * The root layout's shell is static, so the server can't write the user's
 * theme into `<html>`: reading who is logged in there would make every page
 * wait for it. Instead the choice is mirrored in a small cookie, and a tiny
 * inline script in `<head>` copies it onto `<html data-theme="...">` while the
 * HTML is still being parsed, before the first paint. No cookie, or `system`:
 * no attribute, and the CSS follows the device's own setting.
 *
 * The cookie is a convenience copy, not the record: the database is. It holds
 * only `light` or `dark` (no personal data), is not HttpOnly because that
 * script has to read it, and is SameSite=Lax. It stays after log out, so the
 * log in and sign up pages keep the last choice on this device.
 *
 * Pure (no `next/headers`): `theme-cookie.ts` writes it from a Server Action,
 * `ThemeSync` from the browser, and a test runs the script.
 */

import type { ThemeChoice } from "./preferences";

export const THEME_COOKIE = "lx_weather_theme";
export const THEME_COOKIE_SECONDS = 365 * 24 * 60 * 60;

/** The `<head>` script. It only accepts `light` or `dark`; anything else leaves the attribute off. */
export const THEME_BOOT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)(?:;|$)/);if(m)document.documentElement.setAttribute("data-theme",m[1])}catch(e){}})()`;

/** The parts of `document` that `applyTheme` touches, so a test can pass a stand-in. */
export interface ThemeDocument {
  cookie: string;
  documentElement: Pick<Element, "setAttribute" | "removeAttribute">;
}

/**
 * Puts a theme on the page and keeps the cookie in step, from the browser:
 * what `ThemeSync` does once the page knows the account's real choice (after
 * saving it, and on a device whose cookie is stale).
 */
export function applyTheme(doc: ThemeDocument, theme: ThemeChoice, secure: boolean): void {
  const flags = `; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
  if (theme === "system") {
    doc.documentElement.removeAttribute("data-theme");
    doc.cookie = `${THEME_COOKIE}=; Max-Age=0${flags}`;
  } else {
    doc.documentElement.setAttribute("data-theme", theme);
    doc.cookie = `${THEME_COOKIE}=${theme}; Max-Age=${THEME_COOKIE_SECONDS}${flags}`;
  }
}
