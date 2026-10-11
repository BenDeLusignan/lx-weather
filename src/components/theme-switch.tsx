import { saveTheme } from "@/preferences/actions";
import type { ThemeChoice } from "@/preferences/preferences";
import styles from "./theme-switch.module.css";

/**
 * The light/dark switch in the header (Ben, 11 Oct 2026: "make dark mode/light
 * mode a slider the user can choose from the header"): a pill with a sun and a
 * moon in it and a knob that slides under the one in effect.
 *
 * It is a real form with two submit buttons, `theme=light` and `theme=dark`, so
 * it works with no JavaScript and posts the same thing from every device. Why
 * two buttons rather than one toggle: an account that has never chosen follows
 * the device (`system`), and the server can't know whether the device is dark,
 * so "flip it" would have no defined answer; "make it dark" always does.
 *
 * Where the knob sits is decided by CSS from the theme actually in effect
 * (`--theme-is-dark`, globals.css), not by anything this component knows, so it
 * is right on first paint in both themes and for `system`, with no flash.
 * `theme` is the saved choice and only drives the screen-reader state: once
 * someone has chosen, the pressed button says so; while the device decides,
 * neither button claims to be pressed, so nothing false is announced.
 *
 * Logged-in screens only (it lives in the header); the log in and sign up pages
 * follow the device.
 */
export function ThemeSwitch({ theme }: { theme: ThemeChoice }) {
  const pressed = (choice: "light" | "dark") => (theme === "system" ? undefined : theme === choice);

  return (
    <form action={saveTheme} className={styles.form}>
      <div role="group" aria-label="Colour theme" className={styles.track}>
        <span className={styles.knob} aria-hidden="true" />
        <button
          type="submit"
          name="theme"
          value="light"
          aria-label="Light mode"
          aria-pressed={pressed("light")}
          className={`${styles.option} ${styles.sun}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={styles.glyph}>
            <circle cx="12" cy="12" r="4.5" fill="currentColor" />
            <path
              d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="submit"
          name="theme"
          value="dark"
          aria-label="Dark mode"
          aria-pressed={pressed("dark")}
          className={`${styles.option} ${styles.moon}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={styles.glyph}>
            <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </form>
  );
}
