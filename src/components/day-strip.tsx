import type { ShownDay } from "@/preferences/week-view";
import { formatDayHeading, relativeDayName } from "@/weather/format";
import styles from "./day-strip.module.css";
import { HourCell } from "./hour-cell";

/**
 * One day: its heading and a strip of hour cells to scan for the greens. There
 * is deliberately no light for the day itself (Ben's decision, Core flow 7):
 * only the hours are scored.
 *
 * The heading id includes the club: Next keeps the page you just left in the
 * DOM (hidden), so two clubs' weeks can be present at once, and the strip's
 * `aria-labelledby` must not resolve to the other club's heading.
 *
 * The strip is the same fixed number of equal columns on every day
 * (day-strip.module.css), and the cells flow into it in order, so every hour
 * box is the same size on every day however many hours that day shows.
 * A chosen day with no chosen hour left (today) says so.
 */
export function DayStrip({
  clubId,
  shown,
  last,
}: {
  clubId: string;
  shown: ShownDay;
  /** The last day of the week on screen: it keeps room under it for an open hour card (day-strip.module.css). */
  last: boolean;
}) {
  const { day, index, blocks } = shown;
  const headingId = `day-${clubId}-${day.date}`;
  const date = formatDayHeading(day.date);
  const relative = relativeDayName(index);

  return (
    <section className={last ? `${styles.day} ${styles.last}` : styles.day}>
      <h2 id={headingId} className={styles.heading}>
        {relative ? <span className={styles.relative}>{relative}, </span> : null}
        <span className={styles.date}>{date}</span>
      </h2>
      {blocks.length === 0 ? (
        <p className={styles.empty}>No hours left today.</p>
      ) : (
        <ol aria-labelledby={headingId} className={styles.strip}>
          {blocks.map((block) => (
            <HourCell key={block.start} block={block} dayHeading={date} />
          ))}
        </ol>
      )}
    </section>
  );
}
