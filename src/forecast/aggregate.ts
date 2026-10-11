// Pure aggregation of the five providers into one figure per hour (vision, Team
// conventions 1 and 3):
//   - rain chance: MEAN of the providers that gave a value (each is already a probability)
//   - temperature and wind: MEDIAN (one model with a wild value must not drag the figure)
// No contributors means the figure is `null` with providerCount 0, never a number.
//
// ROUNDING: nothing in here rounds. Round once, at the edge where a figure is
// displayed: whole % for rain chance, whole mph and whole km/h for wind, one
// decimal for temperature (°C). Rounding inside the maths would compound errors.

import type { HourlyForecast } from "./open-meteo";
import { PROVIDERS, type ProviderId } from "./providers";

const KMH_PER_MPH = 1.609344;

export function mphToKmh(mph: number): number {
  return mph * KMH_PER_MPH;
}

/** What each provider said for one figure in one hour (`null` = no value). */
export type ByProvider = Record<ProviderId, number | null>;

export interface FigureAggregate {
  /** The aggregate, or `null` when no provider gave a value. */
  value: number | null;
  /** How many providers contributed to `value` (0 to 5): "n of 5 providers". */
  providerCount: number;
  /** Source data: every provider's value for this hour. */
  byProvider: ByProvider;
}

export interface WindAggregate {
  /** Aggregated once, in mph. */
  mph: number | null;
  /** `mph` converted, not aggregated separately. */
  kmh: number | null;
  providerCount: number;
  /** Per-provider values in mph; convert with `mphToKmh` to show km/h. */
  byProvider: ByProvider;
}

export interface HourAggregate {
  /** ISO 8601 UTC instant, from `HourlyForecast.times`. */
  time: string;
  temperatureC: FigureAggregate;
  rainChancePercent: FigureAggregate;
  wind: WindAggregate;
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Even count: the mean of the two middle values. */
function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const upperMiddle = sorted[mid] as number; // the middle value when the count is odd
  return sorted.length % 2 === 1 ? upperMiddle : ((sorted[mid - 1] as number) + upperMiddle) / 2;
}

function figure(
  byProvider: ByProvider,
  combine: (values: number[]) => number | null,
): { value: number | null; providerCount: number } {
  const given = PROVIDERS.flatMap(({ id }) => {
    const v = byProvider[id];
    return v === null ? [] : [v];
  });
  return { value: combine(given), providerCount: given.length };
}

export function aggregateHours(forecast: HourlyForecast): HourAggregate[] {
  return forecast.times.map((time, i) => {
    const pick = (read: (id: ProviderId) => number | null | undefined): ByProvider => {
      const out = {} as ByProvider;
      for (const { id } of PROVIDERS) out[id] = read(id) ?? null;
      return out;
    };
    const temp = pick((id) => forecast.series[id].temperatureC[i]);
    const rain = pick((id) => forecast.series[id].rainChancePercent[i]);
    const wind = pick((id) => forecast.series[id].windMph[i]);

    const windFigure = figure(wind, median);
    return {
      time,
      temperatureC: { ...figure(temp, median), byProvider: temp },
      rainChancePercent: { ...figure(rain, mean), byProvider: rain },
      wind: {
        mph: windFigure.value,
        kmh: windFigure.value === null ? null : mphToKmh(windFigure.value),
        providerCount: windFigure.providerCount,
        byProvider: wind,
      },
    };
  });
}
