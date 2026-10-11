import type { HourlyForecast } from "@/forecast/open-meteo";
import { buildWeek } from "@/forecast/blocks";
import { PROVIDERS, PROVIDER_TOTAL } from "@/forecast/providers";
import { loadClubForecast } from "@/weather/forecast-cache";
import styles from "./club-week.module.css";
import { DayStrip } from "./day-strip";
import { LightKey } from "./light-key";
import { Notice } from "./notice";

const CANT_LOAD = "The forecast can’t be loaded right now. Please try again in a few minutes.";

/**
 * The seven days for one club. Both honest empty states show words and no
 * numbers: the fetch failed, or it worked but all five providers have
 * nothing (vision, Current state: the fetch still returns normally then).
 */
export async function ClubWeek({ clubId }: { clubId: string }) {
  const load = await loadClubForecast(clubId);
  if (!load.ok || load.forecast.unavailable.length >= PROVIDER_TOTAL) {
    return (
      <Notice tone="problem" role="status">
        {CANT_LOAD}
      </Notice>
    );
  }

  // Built per request with the current time, so blocks that have finished
  // drop out even while the cached forecast is still fresh.
  const week = buildWeek(load.forecast, { now: new Date() });
  return (
    <div className={styles.week}>
      <div className={styles.intro}>
        <UnavailableProviders forecast={load.forecast} />
        <LightKey />
        <p className={styles.hint}>Tap an hour for its figures and what each provider says.</p>
      </div>
      <div className={styles.days}>
        {week.map((day, index) => (
          <DayStrip key={day.date} clubId={clubId} day={day} index={index} />
        ))}
      </div>
    </div>
  );
}

/** A provider with nothing at all is said so, and the others are shown without it (Ben's decision 2). */
function UnavailableProviders({ forecast }: { forecast: HourlyForecast }) {
  if (forecast.unavailable.length === 0) return null;
  const labels = PROVIDERS.filter((p) => forecast.unavailable.includes(p.id)).map((p) => p.label);
  return (
    <Notice tone="warning">
      No forecast from {labels.join(", ")} right now. The figures below are built from the others.
    </Notice>
  );
}
