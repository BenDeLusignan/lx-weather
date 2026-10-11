"use client";

import { useEffect, useLayoutEffect } from "react";
import type { ThemeChoice } from "@/preferences/preferences";
import { applyTheme } from "@/preferences/theme";

/**
 * Whether the switch had keyboard focus when it was submitted. At module level
 * and not in a ref or state because saving the theme unmounts this component
 * and mounts a fresh one (the header's Suspense re-renders), which a ref would
 * not survive; the page, and so this module, does.
 */
let switchHadFocus = false;

/**
 * Makes the page match the account's saved theme once it is known, which the
 * first paint can't wait for (`src/preferences/theme.ts` explains the cookie
 * and the script in <head> that handle the first paint). It matters in two
 * cases: right after the theme is saved (the save is a navigation inside the
 * page, which doesn't re-run that script), and on a device whose cookie is
 * stale because the choice was changed on another device. Renders nothing.
 *
 * It also keeps keyboard focus on the header's light/dark switch. The switch is
 * two stacked buttons of which CSS shows only the one for the other theme
 * (`theme-switch.tsx`), and the save re-renders the header, so the button that
 * was focused is gone by the time the new theme lands; left alone, focus would
 * fall to the top of the page and a screen reader would say nothing. So when
 * the switch is submitted from the keyboard (focus is in it), the focus is
 * given back to the button now shown, which also makes a screen reader read
 * out what the switch now does.
 */
export function ThemeSync({ theme }: { theme: ThemeChoice }) {
  // The submit event fires while the pressed button is still focused, before the save starts.
  useEffect(() => {
    const remember = () => {
      switchHadFocus = !!document.querySelector("[data-theme-switch]")?.contains(document.activeElement);
    };
    document.addEventListener("submit", remember, true);
    return () => document.removeEventListener("submit", remember, true);
  }, []);

  useLayoutEffect(() => {
    applyTheme(document, theme, window.location.protocol === "https:");

    if (switchHadFocus) {
      switchHadFocus = false;
      // The shown button is the one with a box; the hidden one is display: none.
      const buttons = document.querySelectorAll<HTMLButtonElement>("[data-theme-switch] button");
      [...buttons].find((b) => b.getClientRects().length > 0)?.focus();
    }
  }, [theme]);
  return null;
}
