import { Suspense } from "react";
import type { Club } from "@/clubs/clubs";
import type { Preferences } from "@/preferences/preferences";
import { Button } from "@/components/button";
import { Disclosure } from "./disclosure";
import { ClubWeek } from "./club-week";
import { WeekLoading } from "./loading";
import styles from "./club-weather.module.css";

/**
 * The week screen for one club: the home screen (`/`) and an Away Game
 * (`/away/[clubId]`) are this same component with a different club (vision,
 * Core flow 4). Club name as the h1, a line on what decides the colour, then
 * the week, then, last of all, the Open-Meteo and UK Met Office credit
 * (CC BY 4.0 and CC BY-SA 4.0, Team convention 2).
 *
 * The club and the heading render at once; the forecast streams in behind
 * <Suspense>, because it may have to be fetched.
 *
 * `preferences` are the user's chosen days and hours, applied to the week
 * (home and away alike).
 *
 * `home` is true for the home screen, which gets the Away Game button
 * (Core flow 4); an away screen links back to the list instead.
 */
export function ClubWeather({
  club,
  home,
  preferences,
}: {
  club: Club;
  home: boolean;
  preferences: Pick<Preferences, "days" | "hours">;
}) {
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
        * Ben (11 Oct 2026) asked for this sentence to sit beside the key
        * ("explain alongside the key that the colour is decided by rain chance
        * and wind speed"). The key has gone (his later words); his list did
        * not name the sentence, so it stays, here above the week. It sits
        * outside <Suspense> so the skeleton and the week start at the same
        * height.
        */}
      <p className={styles.hint}>The colour is decided by the chance of rain and the wind speed.</p>

      <Suspense fallback={<WeekLoading dayCount={preferences.days.length} hourCount={preferences.hours.length} />}>
        <ClubWeek clubId={club.id} preferences={preferences} />
      </Suspense>

      {/*
        * The very bottom of the page (Ben, 11 Oct 2026: "move the weather data
        * line to the very bottom of the page"), and the CC BY credit must never
        * be coverable. The hour card is out of the flow and hangs below its day;
        * the last day reserves room for it while it is open (day-strip.module.css
        * and hour-cell.module.css), so it can't reach this line. It is also
        * shown when the forecast can't be loaded.
        */}
      <p className={styles.credit}>
        Weather data by <a href="https://open-meteo.com">Open-Meteo.com</a> (
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
        ), including UK Met Office model data (
        <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>
        ).
      </p>
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
