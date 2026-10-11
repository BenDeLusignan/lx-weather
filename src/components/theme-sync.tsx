"use client";

import { useLayoutEffect } from "react";
import type { ThemeChoice } from "@/preferences/preferences";
import { applyTheme } from "@/preferences/theme";

/**
 * Makes the page match the account's saved theme once it is known, which the
 * first paint can't wait for (`src/preferences/theme.ts` explains the cookie
 * and the script in <head> that handle the first paint). It matters in two
 * cases: right after the theme is saved (the save is a navigation inside the
 * page, which doesn't re-run that script), and on a device whose cookie is
 * stale because the choice was changed on another device. Renders nothing.
 */
export function ThemeSync({ theme }: { theme: ThemeChoice }) {
  useLayoutEffect(() => {
    applyTheme(document, theme, window.location.protocol === "https:");
  }, [theme]);
  return null;
}
