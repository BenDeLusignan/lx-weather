import { Suspense } from "react";
import type { Club } from "@/clubs/clubs";
import { Button } from "@/components/button";
import { Disclosure } from "./disclosure";
import { ClubWeek } from "./club-week";
import { WeekLoading } from "./loading";
import styles from "./club-weather.module.css";

/**
 * The week screen for one club: the home screen (`/`) and an Away Game
 * (`/away/[clubId]`) are this same component with a different club (vision,
 * Core flow 4). Club name as the h1, the Open-Meteo credit (CC BY 4.0, Team
 * convention 2), then the week.
 *
 * The club and the heading render at once; the forecast streams in behind
 * <Suspense>, because it may have to be fetched.
 *
 * `home` is true for the home screen, which gets the Away Game button
 * (Core flow 4); an away screen links back to the list instead.
 */
export function ClubWeather({ club, home }: { club: Club; home: boolean }) {
  return (
    <div className={styles.screen}>
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>{home ? "Your home club" : "Away game"}</p>
          <h1 className={styles.clubName}>{club.name}</h1>
          <ClubPlace club={club} />
        </div>
        <div className={styles.actions}>
          {home ? (
            <Button href="/away">Away Game</Button>
          ) : (
            <Button href="/away" variant="secondary">
              ← Away Game list
            </Button>
          )}
        </div>
      </div>

      {/*
        * Above the week, not below it: an open hour card is positioned over
        * what follows the last day, and the CC BY credit must never be
        * coverable. It is also shown when the forecast can't be loaded.
        */}
      <p className={styles.credit}>
        Weather data by <a href="https://open-meteo.com">Open-Meteo.com</a> (
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)
      </p>

      <Suspense fallback={<WeekLoading />}>
        <ClubWeek clubId={club.id} />
      </Suspense>
    </div>
  );
}

/** The address, or for a merged entry (Belfast) the clubs it stands for. */
function ClubPlace({ club }: { club: Club }) {
  if (!club.includes) return <p className={styles.place}>{club.address}</p>;
  return (
    <Disclosure summary={`The forecast for the middle of ${club.includes.length} clubs`}>
      <ul className={styles.includes}>
        {club.includes.map((included) => (
          <li key={included.name}>
            {included.name}, {included.address}
          </li>
        ))}
      </ul>
    </Disclosure>
  );
}
