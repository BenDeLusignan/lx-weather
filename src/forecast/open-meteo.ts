// One Open-Meteo call for all five providers' hourly forecast (7 days by default).
//
// Response shape (checked live on 11 Oct 2026): because we send several `models`,
// every hourly variable comes back once per model with the model id as a suffix,
// e.g. `temperature_2m_ukmo_seamless`. (With a single model the names are NOT
// suffixed; we always send all five, so that shape never reaches us.)
// With `timeformat=unixtime` `hourly.time` holds UTC epoch seconds, which avoids
// the ambiguous local clock times of a daylight-saving change inside the range.
// `null` in a column means that model has no value for that hour (the models
// reach different distances ahead, see vision Team convention 2).
//
// Nothing here fills a gap: no interpolation, no copying from another provider,
// no default values (vision, Ben's decision 2).

import { PROVIDERS, type ProviderId } from "./providers";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_DAYS = 7; // one week (vision, Core flow 1)
const MAX_DAYS = 16; // Open-Meteo's limit
const TIMEOUT_MS = 10_000;

export type ForecastFetchErrorKind =
  /** Could not reach Open-Meteo (offline, DNS, timeout). */
  | "network"
  /** Open-Meteo answered with a non-2xx status. */
  | "http"
  /** Open-Meteo answered `{ error: true, reason }`. */
  | "api"
  /** The answer was not the JSON shape we expect. */
  | "invalid-response";

/**
 * The whole forecast could not be fetched. The caller shows an honest empty
 * state (vision, Ben's decision 2); `message` carries the reason.
 */
export class ForecastFetchError extends Error {
  readonly kind: ForecastFetchErrorKind;
  readonly status?: number;

  constructor(
    kind: ForecastFetchErrorKind,
    message: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ForecastFetchError";
    this.kind = kind;
    this.status = options?.status;
  }
}

/** One provider's hourly values, index-aligned with `HourlyForecast.times`. `null` = no value. */
export interface ProviderSeries {
  temperatureC: (number | null)[];
  rainChancePercent: (number | null)[];
  windMph: (number | null)[];
}

export interface HourlyForecast {
  /**
   * ISO 8601 UTC instants, one per hour. The series starts at local midnight
   * (Europe/London) today, so the first hours are already past.
   */
  times: string[];
  /** Source data per provider, for "expand source data". */
  series: Record<ProviderId, ProviderSeries>;
  /**
   * Providers with no value at all (every figure null for every hour). They
   * contribute nothing to any aggregate; show them as unavailable, never as zeros.
   */
  unavailable: ProviderId[];
}

export interface FetchHourlyForecastOptions {
  latitude: number;
  longitude: number;
  /** 1 to 16; default 7 (one week). */
  days?: number;
  /** Injected in tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

export async function fetchHourlyForecast(
  options: FetchHourlyForecastOptions,
): Promise<HourlyForecast> {
  const { latitude, longitude, days = DEFAULT_DAYS, fetchImpl = fetch } = options;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError(`latitude must be between -90 and 90, got ${latitude}`);
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError(`longitude must be between -180 and 180, got ${longitude}`);
  }
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    throw new RangeError(`days must be a whole number from 1 to ${MAX_DAYS}, got ${days}`);
  }

  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    models: PROVIDERS.map((p) => p.model).join(","),
    hourly: "temperature_2m,precipitation_probability,wind_speed_10m",
    timezone: "Europe/London",
    wind_speed_unit: "mph",
    timeformat: "unixtime",
    forecast_days: String(days),
  }).toString();

  let response: Response;
  let body: string;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    body = await response.text();
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new ForecastFetchError("network", `Could not reach Open-Meteo: ${detail}`, { cause });
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch (cause) {
    if (!response.ok) {
      throw new ForecastFetchError(
        "http",
        `Open-Meteo answered HTTP ${response.status} ${response.statusText}`.trim(),
        { status: response.status, cause },
      );
    }
    throw new ForecastFetchError("invalid-response", "Open-Meteo did not return JSON", { cause });
  }

  if (isRecord(json) && json.error === true) {
    const reason = typeof json.reason === "string" ? json.reason : "no reason given";
    throw new ForecastFetchError("api", `Open-Meteo rejected the request: ${reason}`, {
      status: response.ok ? undefined : response.status,
    });
  }
  if (!response.ok) {
    throw new ForecastFetchError(
      "http",
      `Open-Meteo answered HTTP ${response.status} ${response.statusText}`.trim(),
      { status: response.status },
    );
  }

  return parseHourly(json);
}

/** Takes the decoded JSON of a successful response. */
function parseHourly(json: unknown): HourlyForecast {
  const hourly = isRecord(json) ? json.hourly : undefined;
  if (!isRecord(hourly) || !Array.isArray(hourly.time)) {
    throw new ForecastFetchError("invalid-response", "Open-Meteo response has no hourly.time");
  }
  const times = hourly.time.map((t): string => {
    if (typeof t !== "number" || !Number.isFinite(t)) {
      throw new ForecastFetchError("invalid-response", `Open-Meteo gave a bad hourly time: ${String(t)}`);
    }
    return new Date(t * 1000).toISOString();
  });

  let columnsFound = 0;
  const column = (variable: string, model: string): (number | null)[] => {
    const name = `${variable}_${model}`;
    const raw = hourly[name];
    // A model/variable we asked for but did not get is "no data", never a default.
    if (raw === undefined) return times.map(() => null);
    if (!Array.isArray(raw) || raw.length !== times.length) {
      throw new ForecastFetchError("invalid-response", `Open-Meteo column ${name} does not match hourly.time`);
    }
    columnsFound++;
    return raw.map((v): number | null => {
      if (v === null) return null;
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new ForecastFetchError("invalid-response", `Open-Meteo column ${name} has a bad value: ${String(v)}`);
      }
      return v;
    });
  };

  const series = {} as Record<ProviderId, ProviderSeries>;
  const unavailable: ProviderId[] = [];
  for (const { id, model } of PROVIDERS) {
    const s: ProviderSeries = {
      temperatureC: column("temperature_2m", model),
      rainChancePercent: column("precipitation_probability", model),
      windMph: column("wind_speed_10m", model),
    };
    series[id] = s;
    const hasAnyValue = [s.temperatureC, s.rainChancePercent, s.windMph].some((col) =>
      col.some((v) => v !== null),
    );
    if (!hasAnyValue) unavailable.push(id);
  }

  // Not one expected column: the response shape is not what we think it is.
  if (columnsFound === 0) {
    throw new ForecastFetchError("invalid-response", "Open-Meteo response has none of the expected hourly columns");
  }

  return { times, series, unavailable };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
