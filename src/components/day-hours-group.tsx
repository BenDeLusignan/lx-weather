import { DEFAULT_DAY_HOURS, WEEKDAYS, type DayHours } from "@/preferences/preferences";
import { DayHoursRow } from "./day-hours-row";
import styles from "./day-hours-group.module.css";

const HINT_ID = "account-days-hint";

/**
 * The seven weekdays with their checkbox and hours (Core flow 8), for the
 * Account form. `days` is the saved week, Monday first: `null` for a day that
 * is off, whose sliders start at the whole window if it is ticked again.
 *
 * A fieldset with a visually hidden legend: the page's own
 * heading above it names the group, and a screen reader hears the legend with
 * each day. The hint is its description.
 */
export function DayHoursGroup({ days }: { days: readonly (DayHours | null)[] }) {
  return (
    <fieldset className={styles.group} aria-describedby={HINT_ID}>
      <legend className="visually-hidden">Show these days, and from when to when</legend>
      <p id={HINT_ID} className={styles.hint}>
        Tick the days you want to see, then choose the first and last hour for each. 08:00 to 22:00 is the whole
        day. The week always starts today, and the same days and times apply at every club.
      </p>
      <div className={styles.days}>
        {WEEKDAYS.map((weekday, index) => {
          const hours = days[index] ?? DEFAULT_DAY_HOURS;
          return (
            <DayHoursRow
              key={weekday.id}
              id={weekday.id}
              label={weekday.label}
              on={days[index] !== null && days[index] !== undefined}
              start={hours.start}
              end={hours.end}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
