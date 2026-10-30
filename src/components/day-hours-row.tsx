"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { BLOCK_HOURS, rangeFieldName, type WeekdayId } from "@/preferences/preferences";
import { hourLabel } from "@/weather/format";
import styles from "./day-hours-row.module.css";

const FIRST_HOUR = BLOCK_HOURS[0] as number;
const LAST_HOUR = BLOCK_HOURS[BLOCK_HOURS.length - 1] as number;

/**
 * One weekday on the Account page: a checkbox ("show this day") and, while it
 * is ticked, two sliders for the first and last hour of that day (Core flow 8).
 * The sliders are native `<input type="range">`, one step an hour, so a phone
 * gets its own slider and a keyboard gets the arrow, Home and End keys.
 *
 * Both sliders count in block start hours, exactly as they are stored and
 * posted (8 to 21), so the end slider at 21 means the last block, 21:00 to
 * 22:00, and says "22:00": the time the day ends. The readout puts the two
 * together, "17:00 to 22:00".
 *
 * It is a client component for the two things CSS can't do: stop the handles
 * crossing (a handle dragged past the other stops at it) and keep the readout
 * and each slider's spoken value ("17:00") in step. Everything else works
 * without JavaScript: the checkbox shows and hides the sliders by CSS alone
 * (`:has(:checked)`), the form posts as it is, and the server checks it all,
 * including a start after its end (`parseDays`).
 *
 * The inputs are uncontrolled, like `NewPasswordInput`, so a slider moved
 * before the page has hydrated isn't reset: the DOM holds the value and the
 * effects pick it up. The sliders of an unticked day are hidden, not removed,
 * so ticking it again brings back what was there; the server ignores them.
 */
export function DayHoursRow({
  id,
  label,
  on,
  start,
  end,
}: {
  id: WeekdayId;
  label: string;
  /** Whether the day is shown (ticked). */
  on: boolean;
  /** The saved first and last block's start hour; the whole window for a day that is off. */
  start: number;
  end: number;
}) {
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const [range, setRange] = useState({ start, end });
  // Unique to this form: Next keeps the page you just left in the DOM (Team convention 8).
  const labelId = `day-hours-${id}-label`;
  const summaryId = `day-hours-${id}-summary`;

  // Read what the DOM holds: a slider moved before hydration, a changed saved
  // value arriving after a save (the inputs follow their defaults once the
  // form has been reset), and the form's own "reset".
  useEffect(() => {
    const startInput = startRef.current;
    const endInput = endRef.current;
    if (!startInput || !endInput) return;
    const sync = () => {
      const next = { start: Number(startInput.value), end: Number(endInput.value) };
      setRange((current) => (current.start === next.start && current.end === next.end ? current : next));
    };
    sync();
    const form = startInput.form;
    // The reset event fires before the inputs are put back, so read them a tick later.
    const reset = () => setTimeout(sync, 0);
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [start, end]);

  function moveStart(event: ChangeEvent<HTMLInputElement>) {
    const other = Number(endRef.current?.value ?? end);
    const value = Math.min(Number(event.currentTarget.value), other);
    // Stops at the other handle: the slider is put back, so the two never cross.
    event.currentTarget.value = String(value);
    setRange({ start: value, end: other });
  }

  function moveEnd(event: ChangeEvent<HTMLInputElement>) {
    const other = Number(startRef.current?.value ?? start);
    const value = Math.max(Number(event.currentTarget.value), other);
    event.currentTarget.value = String(value);
    setRange({ start: other, end: value });
  }

  return (
    <div role="group" aria-labelledby={labelId} className={styles.row}>
      <label className={styles.day}>
        <input type="checkbox" name="days" value={id} defaultChecked={on} className={styles.check} />
        <span id={labelId}>{label}</span>
      </label>
      <div className={styles.range}>
        {/* The chosen range in words; the end is the time the last block finishes. */}
        <p id={summaryId} className={styles.summary}>
          {hourLabel(range.start)} to {hourLabel(range.end + 1)}
        </p>
        <label className={styles.slider}>
          <span className={styles.name}>
            <span className="visually-hidden">{label} </span>Start
          </span>
          <input
            ref={startRef}
            type="range"
            name={rangeFieldName(id, "start")}
            min={FIRST_HOUR}
            max={LAST_HOUR}
            step={1}
            defaultValue={start}
            aria-valuetext={hourLabel(range.start)}
            aria-describedby={summaryId}
            onChange={moveStart}
          />
        </label>
        <label className={styles.slider}>
          <span className={styles.name}>
            <span className="visually-hidden">{label} </span>End
          </span>
          <input
            ref={endRef}
            type="range"
            name={rangeFieldName(id, "end")}
            min={FIRST_HOUR}
            max={LAST_HOUR}
            step={1}
            defaultValue={end}
            aria-valuetext={hourLabel(range.end + 1)}
            aria-describedby={summaryId}
            onChange={moveEnd}
          />
        </label>
      </div>
    </div>
  );
}
