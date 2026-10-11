import { saveTheme } from "@/preferences/actions";
import styles from "./theme-switch.module.css";

/**
 * The light/dark switch in the header (Ben, 11 Oct 2026: "make dark mode/light
 * mode a slider the user can choose from the header"; and later the same day:
 * "keep its appearance but make it function as one button, changing to dark if
 * the screen is currently light and vice versa"): a pill with a sun and a moon
 * in it and a knob that slides under the one in effect. Pressing it anywhere
 * switches to the other theme.
 *
 * It is a real form, so it works with no JavaScript and before the page has
 * hydrated. The catch: an account that has never chosen follows the device
 * (`system`), and the server can't see whether the device is dark, so it has
 * no way to know which way "the other theme" is. So the page's own CSS decides,
 * the same way it decides the colours: there are two submit buttons, `dark`
 * ("Switch to dark mode") and `light` ("Switch to light mode"), stacked in the
 * same place, and only the one for the theme NOT in effect is displayed
 * (theme-switch.module.css; the other is `display: none`, so it isn't
 * focusable and a screen reader meets exactly one button, named for what it
 * does). The theme in effect is `<html data-theme>`, or the device's when there
 * is none, the same two conditions as `--theme-is-dark` in globals.css.
 * `saveTheme` still accepts only light or dark and still needs a login.
 *
 * Why not one client component that reads the theme and sets a hidden value:
 * it would need JavaScript to be right for `system` (without it the value
 * would be a guess), and its label would have to be kept in step by script.
 * The CSS version is right on first paint, with no flash and no JavaScript.
 * The one thing CSS can't do is keep keyboard focus when the shown button
 * swaps; `ThemeSync` does that (see it), found by `data-theme-switch`.
 *
 * The picture is one track with one knob, behind the buttons (which are
 * transparent and cover it), so the knob still slides when the theme changes.
 *
 * Logged-in screens only (it lives in the header); the log in and sign up pages
 * follow the device.
 */
export function ThemeSwitch() {
  return (
    <form action={saveTheme} className={styles.switch} data-theme-switch>
      {/* Before the track in the markup so `~` can reach the icon each one switches to (hover). */}
      <button
        type="submit"
        name="theme"
        value="dark"
        aria-label="Switch to dark mode"
        className={`${styles.button} ${styles.toDark}`}
      />
      <button
        type="submit"
        name="theme"
        value="light"
        aria-label="Switch to light mode"
        className={`${styles.button} ${styles.toLight}`}
      />
      <span aria-hidden="true" className={styles.track}>
        <span className={styles.knob} />
        <svg viewBox="0 0 24 24" focusable="false" className={`${styles.glyph} ${styles.sun}`}>
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <path
            d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <svg viewBox="0 0 24 24" focusable="false" className={`${styles.glyph} ${styles.moon}`}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" fill="currentColor" />
        </svg>
      </span>
    </form>
  );
}
