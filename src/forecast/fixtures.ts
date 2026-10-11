// Shared builders for the forecast tests (fake data only; never imported by app code).
import type { HourlyForecast, ProviderSeries } from "./open-meteo";
import { PROVIDERS, type ProviderId } from "./providers";

export function emptySeries(hours: number): ProviderSeries {
  const nulls = () => Array.from({ length: hours }, () => null);
  return { temperatureC: nulls(), rainChancePercent: nulls(), windMph: nulls() };
}

/** A forecast whose providers are all-null unless `overrides` says otherwise. */
export function forecastOf(
  hours: number,
  overrides: Partial<Record<ProviderId, Partial<ProviderSeries>>>,
): HourlyForecast {
  const times = Array.from({ length: hours }, (_, i) => new Date(Date.UTC(2026, 9, 11, i)).toISOString());
  const series = {} as Record<ProviderId, ProviderSeries>;
  for (const { id } of PROVIDERS) series[id] = { ...emptySeries(hours), ...overrides[id] };
  return { times, series, unavailable: [] };
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
