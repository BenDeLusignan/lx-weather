// Shared builders for the forecast tests (fake data only; never imported by app code).
import type { ByProvider } from "./aggregate";
import type { HourlyForecast, ProviderSeries } from "./open-meteo";
import { PROVIDERS, type ProviderId } from "./providers";

/** Per-provider values, `null` for every provider not named. */
export function by(values: Partial<Record<ProviderId, number | null>>): ByProvider {
  const out = {} as ByProvider;
  for (const { id } of PROVIDERS) out[id] = values[id] ?? null;
  return out;
}

export function emptySeries(hours: number): ProviderSeries {
  const nulls = () => Array.from({ length: hours }, () => null);
  return { temperatureC: nulls(), rainChancePercent: nulls(), windMph: nulls() };
}

/**
 * A forecast of `hours` hourly stamps from `startUtc`. Providers are all-null
 * unless `overrides` gives a column.
 */
export function forecastOf(
  startUtc: string,
  hours: number,
  overrides: Partial<Record<ProviderId, Partial<ProviderSeries>>>,
): HourlyForecast {
  const start = Date.parse(startUtc);
  const times = Array.from({ length: hours }, (_, i) => new Date(start + i * 3_600_000).toISOString());
  const series = {} as Record<ProviderId, ProviderSeries>;
  for (const { id } of PROVIDERS) series[id] = { ...emptySeries(hours), ...overrides[id] };
  return { times, series, unavailable: [] };
}

/** A column of `hours` values computed from the stamp's index and its UTC instant. */
export function column(
  startUtc: string,
  hours: number,
  value: (index: number, utc: Date) => number | null,
): (number | null)[] {
  const start = Date.parse(startUtc);
  return Array.from({ length: hours }, (_, i) => value(i, new Date(start + i * 3_600_000)));
}

/** An Open-Meteo style multi-model JSON body for `hours` hours from 2026-10-11 00:00 UTC. */
export function openMeteoBody(
  hours: number,
  columns: Record<string, (number | null)[]>,
): Record<string, unknown> {
  const start = Date.UTC(2026, 9, 11) / 1000;
  return {
    utc_offset_seconds: 3600,
    timezone: "Europe/London",
    hourly: { time: Array.from({ length: hours }, (_, i) => start + i * 3600), ...columns },
  };
}

export function fakeFetch(
  body: string,
  init: { status?: number; statusText?: string } = {},
): typeof fetch {
  return async () => new Response(body, { status: init.status ?? 200, statusText: init.statusText ?? "" });
}
