import { stripColumns } from "@/weather/format";
import type { CSSProperties } from "react";
import styles from "./loading.module.css";

/**
 * The fallback while a page waits for something it can only know on the
 * server: who is logged in. It doesn't know yet whether that will be a form
 * or a week, so it's a few quiet lines; the words are for screen readers.
 * (The pulse stops under prefers-reduced-motion: see globals.css.)
 */
export function PageLoading() {
  return (
    <div role="status" className={styles.page}>
      <span className="visually-hidden">Loading…</span>
      <div aria-hidden="true" className={styles.page}>
        <div className={`${styles.bar} ${styles.title}`} />
        <div className={`${styles.bar} ${styles.line}`} />
        <div className={`${styles.bar} ${styles.line}`} />
      </div>
    </div>
  );
}

/**
 * The fallback for the forecast itself, which may have to be fetched: seven
 * days of grey cells in the shape of the real week, under a "Loading the
 * forecast" line. The club's name and buttons are already on screen. The
 * counts are the user's chosen days and hours, so it has the shape of the week
 * that will arrive (the week is always seven consecutive days, so a chosen
 * number of weekdays is exactly that many days).
 */
export function WeekLoading({ dayCount, hourCount }: { dayCount: number; hourCount: number }) {
  const columns = stripColumns(hourCount);
  return (
    <div role="status">
      <p className="visually-hidden">Loading the forecast…</p>
      <ol aria-hidden="true" className={styles.week}>
        {Array.from({ length: dayCount }, (_, day) => (
          <li key={day} className={styles.day}>
            <div className={`${styles.bar} ${styles.dayTitle}`} />
            <div
              className={styles.cells}
              style={{ "--columns-phone": columns.phone, "--columns-wide": columns.wide } as CSSProperties}
            >
              {Array.from({ length: hourCount }, (_, hour) => (
                <div key={hour} className={styles.cell} />
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
