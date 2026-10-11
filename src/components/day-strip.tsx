import type { Day } from "@/forecast/blocks";
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
 */
export function DayStrip({ clubId, day, index }: { clubId: string; day: Day; index: number }) {
  const headingId = `day-${clubId}-${day.date}`;
  const date = formatDayHeading(day.date);
  const relative = relativeDayName(index);

  return (
    <section className={styles.day}>
      <h2 id={headingId} className={styles.heading}>
        {relative ? <span className={styles.relative}>{relative}, </span> : null}
        <span className={styles.date}>{date}</span>
      </h2>
      {day.blocks.length === 0 ? (
        <p className={styles.empty}>No hours left today.</p>
      ) : (
        <ol aria-labelledby={headingId} className={styles.strip}>
          {day.blocks.map((block) => (
            <HourCell key={block.start} block={block} dayHeading={date} />
          ))}
        </ol>
      )}
    </section>
  );
}
