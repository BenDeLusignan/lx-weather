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
 * The fallback for the forecast itself, which may have to be fetched: a day
 * of grey cells for each chosen day, in the shape of the real week, under a
 * "Loading the forecast" line. The club's name and buttons are already on
 * screen. `hourCounts` is one number per chosen day, in the week's order
 * (`shownHourCounts` in `src/preferences/week-view.ts`): each day has the
 * hours that weekday is set to, so it has the shape of the week that will
 * arrive.
 */
export function WeekLoading({ hourCounts }: { hourCounts: readonly number[] }) {
  return (
    <div role="status">
      <p className="visually-hidden">Loading the forecast…</p>
      <ol aria-hidden="true" className={styles.week}>
        {hourCounts.map((hourCount, day) => (
          <li key={day} className={styles.day}>
            <div className={`${styles.bar} ${styles.dayTitle}`} />
            <div className={styles.cells}>
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
