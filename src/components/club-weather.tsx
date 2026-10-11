import { Suspense } from "react";
import type { Club } from "@/clubs/clubs";
import { Button } from "@/components/button";
import { mphToKmh } from "@/forecast/aggregate";
import { buildWeek, type Block, type Day, type Light } from "@/forecast/blocks";
import type { HourlyForecast } from "@/forecast/open-meteo";
import { PROVIDERS, PROVIDER_TOTAL } from "@/forecast/providers";
import { loadClubForecast } from "@/weather/forecast-cache";
import {
  formatDayHeading,
  formatRainChance,
  formatTemperature,
  formatWind,
  hourLabel,
  providerCountNote,
} from "@/weather/format";
import styles from "./club-weather.module.css";

/**
 * The week screen for one club: the home screen (`/`) and an Away Game
 * (`/away/[clubId]`) are this same component with a different club (vision,
 * Core flow 4). Club name as the h1, the hour blocks of the week below it,
 * and the Open-Meteo credit (CC BY 4.0, Team convention 2).
 *
 * The club and the heading render at once; the forecast streams in behind
 * <Suspense>, because it may have to be fetched.
 */
export function ClubWeather({ club }: { club: Club }) {
  return (
    <div>
      <h1 className={styles.clubName}>{club.name}</h1>
      <ClubPlace club={club} />
      <p className={styles.awayGame}>
        <Button href="/away">Away Game</Button>
      </p>

      <Suspense fallback={<p role="status">Loading the forecast…</p>}>
        <ClubWeek clubId={club.id} />
      </Suspense>

      <footer className={styles.credit}>
        <p>
          Weather data by <a href="https://open-meteo.com">Open-Meteo.com</a> (
          <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)
        </p>
      </footer>
    </div>
  );
}

/** The address, or for a merged entry (Belfast) the clubs it stands for. */
function ClubPlace({ club }: { club: Club }) {
  if (!club.includes) return <p className={styles.place}>{club.address}</p>;
  return (
    <div className={styles.place}>
      <p>The forecast for the middle of these clubs:</p>
      <ul className={styles.includes}>
        {club.includes.map((included) => (
          <li key={included.name}>
            {included.name}, {included.address}
          </li>
        ))}
      </ul>
    </div>
  );
}

const CANT_LOAD = "The forecast can’t be loaded right now. Please try again in a few minutes.";

async function ClubWeek({ clubId }: { clubId: string }) {
  const load = await loadClubForecast(clubId);
  // Both honest empty states, never numbers: the fetch failed, or it worked
  // but all five providers have nothing (vision, Current state: the fetch
  // still returns normally then).
  if (!load.ok || load.forecast.unavailable.length >= PROVIDER_TOTAL) {
    return (
      <p role="status" className={styles.notice}>
        {CANT_LOAD}
      </p>
    );
  }

  // Built per request with the current time, so blocks that have finished
  // drop out even while the cached forecast is still fresh.
  const week = buildWeek(load.forecast, { now: new Date() });
  return (
    <>
      <UnavailableProviders forecast={load.forecast} />
      {week.map((day) => (
        <DaySection key={day.date} day={day} />
      ))}
    </>
  );
}

/** A provider with nothing at all is said so, and the others are shown without it (Ben's decision 2). */
function UnavailableProviders({ forecast }: { forecast: HourlyForecast }) {
  if (forecast.unavailable.length === 0) return null;
  const labels = PROVIDERS.filter((p) => forecast.unavailable.includes(p.id)).map((p) => p.label);
  return (
    <p className={styles.notice}>
      No forecast from {labels.join(", ")} right now. The figures below are built from the others.
    </p>
  );
}

function DaySection({ day }: { day: Day }) {
  const headingId = `day-${day.date}`;
  return (
    <section aria-labelledby={headingId} className={styles.day}>
      <h2 id={headingId} className={styles.dayHeading}>
        {formatDayHeading(day.date)}
      </h2>
      {day.blocks.length === 0 ? (
        <p>No hours left today.</p>
      ) : (
        <ol className={styles.blocks}>
          {day.blocks.map((block) => (
            <BlockItem key={block.start} block={block} />
          ))}
        </ol>
      )}
    </section>
  );
}

const LIGHT_WORDS: Record<Light, string> = {
  green: "Good",
  yellow: "Passable",
  red: "Unlikely",
};

/** Why a light is unknown: the figure that couldn't be judged. Never guessed (Ben's decision 2). */
function unknownReason(block: Block): string {
  if (block.rainLight === null && block.windLight === null) return "no rain or wind data";
  return block.windLight === null ? "no wind data" : "no rain data";
}

function BlockItem({ block }: { block: Block }) {
  const timeRange = `${hourLabel(block.startHour)}–${hourLabel(block.startHour + 1)}`;
  const lightClass = styles[block.light ?? "unknown"];
  const temperatureNote = providerCountNote(block.temperatureC.providerCount);
  const rainNote = providerCountNote(block.rainChancePercent.providerCount);
  const windNote = providerCountNote(block.wind.providerCount);

  return (
    <li className={`${styles.block} ${lightClass}`}>
      <h3 className={styles.time}>{timeRange}</h3>
      <p className={styles.light}>
        <span className="visually-hidden">Light: </span>
        {block.light ? LIGHT_WORDS[block.light] : "Unknown"}
        {block.light === null ? <span className={styles.reason}> ({unknownReason(block)})</span> : null}
      </p>
      <dl className={styles.figures}>
        <Figure label="Temperature" value={formatTemperature(block.temperatureC.value)} note={temperatureNote} />
        <Figure label="Chance of rain" value={formatRainChance(block.rainChancePercent.value)} note={rainNote} />
        <Figure label="Wind" value={formatWind(block.wind.mph, block.wind.kmh)} note={windNote} />
      </dl>
      <details className={styles.source}>
        <summary>
          Expand source data<span className="visually-hidden"> for {timeRange}</span>
        </summary>
        <SourceTable block={block} timeRange={timeRange} />
      </details>
    </li>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note: string | null }) {
  return (
    <div className={styles.figure}>
      <dt>{label}</dt>
      <dd>
        {value}
        {note ? <span className={styles.count}> ({note})</span> : null}
      </dd>
    </div>
  );
}

/** What each of the five providers says for this block, with a clear "no data" for a gap (Product rule 1). */
function SourceTable({ block, timeRange }: { block: Block; timeRange: string }) {
  return (
    <table className={styles.sourceTable}>
      <caption className="visually-hidden">What each provider says for {timeRange}</caption>
      <thead>
        <tr>
          <th scope="col">Provider</th>
          <th scope="col">Temp</th>
          <th scope="col">Rain</th>
          <th scope="col">Wind</th>
        </tr>
      </thead>
      <tbody>
        {PROVIDERS.map(({ id, label }) => {
          const mph = block.wind.byProvider[id];
          return (
            <tr key={id}>
              <th scope="row">{label}</th>
              <td>{formatTemperature(block.temperatureC.byProvider[id])}</td>
              <td>{formatRainChance(block.rainChancePercent.byProvider[id])}</td>
              <td>{mph === null ? "no data" : formatWind(mph, mphToKmh(mph))}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
