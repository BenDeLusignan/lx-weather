import type { CSSProperties } from "react";
import type { ShownDay } from "@/preferences/week-view";
import { formatDayHeading, relativeDayName, stripColumns } from "@/weather/format";
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
 * `hours` are the user's chosen hours: a cell's column is its place among
 * them, the same on every day, and the strip has one column per chosen hour.
 * A chosen day with no chosen hour left (today) says so.
 */
export function DayStrip({ clubId, shown, hours }: { clubId: string; shown: ShownDay; hours: readonly number[] }) {
  const { day, index, blocks } = shown;
  const columns = stripColumns(hours.length);
  const headingId = `day-${clubId}-${day.date}`;
  const date = formatDayHeading(day.date);
  const relative = relativeDayName(index);

  return (
    <section className={styles.day}>
      <h2 id={headingId} className={styles.heading}>
        {relative ? <span className={styles.relative}>{relative}, </span> : null}
        <span className={styles.date}>{date}</span>
      </h2>
      {blocks.length === 0 ? (
        <p className={styles.empty}>No hours left today.</p>
      ) : (
        <ol
          aria-labelledby={headingId}
          className={styles.strip}
          style={{ "--columns-phone": columns.phone, "--columns-wide": columns.wide } as CSSProperties}
        >
          {blocks.map((block) => (
            <HourCell
              key={block.start}
              block={block}
              dayHeading={date}
              position={hours.indexOf(block.startHour)}
              hourCount={hours.length}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
