import { cacheLife } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { findClub } from "@/clubs/lookup";
import { fetchHourlyForecast, type HourlyForecast } from "@/forecast/open-meteo";

/**
 * One club's hourly forecast, fetched on the server and cached for up to an
 * hour per club (Team convention 5), so the five providers aren't called on
 * every page view. Open-Meteo is hit once per club per hour at most, and
 * Belfast's five clubs share one entry, so the call count stays far under the
 * free limit.
 *
 * Only the fetched hourly forecast is cached: plain JSON, with no clock in
 * it. The week is built from it per request (`buildWeek` with the current
 * time, in `ClubWeatherWeek`), so blocks that have finished drop out even
 * while the forecast itself is still cached.
 *
 * A failed fetch is never cached: `fetchHourlyForecast` throws
 * `ForecastFetchError`, and an error thrown inside a `"use cache"` function
 * is passed to the caller and nothing is stored, so the next request tries
 * again. The caller therefore sees a failure as an exception and must not
 * assume which class it is (`loadClubForecast` below deals with that).
 *
 * Lifetime: fresh for 50 minutes, and never served after an hour: from 50 to
 * 60 minutes an entry is refreshed in the background on the next request,
 * past 60 the request waits for a new fetch. With only `revalidate: 3600` an
 * entry could be served stale for far longer than an hour on a quiet site.
 */
async function cachedForecast(clubId: string): Promise<HourlyForecast> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3000, expire: 3600 });

  const club = findClub(clubId);
  if (!club) throw new Error(`Unknown club id: ${clubId}`);
  return fetchHourlyForecast({ latitude: club.latitude, longitude: club.longitude });
}

/** The outcome of loading a forecast: the data, or the plain fact that it couldn't be loaded. */
export type ForecastLoad = { ok: true; forecast: HourlyForecast } | { ok: false };

/**
 * Loads the cached forecast for a club. Any failure becomes `{ ok: false }`,
 * which the page words as "can't be loaded right now" and never fills with
 * numbers (Ben's decision 2). It catches every error rather than only
 * `ForecastFetchError` because an error crossing the `"use cache"` boundary
 * isn't guaranteed to keep its class.
 */
export async function loadClubForecast(clubId: string): Promise<ForecastLoad> {
  try {
    return { ok: true, forecast: await cachedForecast(clubId) };
  } catch (error) {
    // Next's own control-flow errors (not failures of ours) must keep going up.
    unstable_rethrow(error);
    console.error(`Forecast for ${clubId} could not be loaded:`, error);
    return { ok: false };
  }
}
