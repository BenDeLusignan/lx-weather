// Pure aggregation of what the five providers say into one figure (vision, Team
// conventions 1 and 3):
//   - rain chance: MEAN of the providers that gave a value (each is already a probability)
//   - temperature and wind: MEDIAN (one model with a wild value must not drag the figure)
// No contributors means the figure is `null` with providerCount 0, never a number.
//
// ROUNDING: nothing in here rounds. Round once, at the edge where a figure is
// displayed: whole % for rain chance, whole mph and whole km/h for wind, one
// decimal for temperature (°C). The lights round the same way themselves
// (rain-light.ts, wind-light.ts). Rounding inside the maths would compound errors.

import { PROVIDERS, type ProviderId } from "./providers";

export const KMH_PER_MPH = 1.609344;

export function mphToKmh(mph: number): number {
  return mph * KMH_PER_MPH;
}

/** What each provider said for one figure (`null` = no value). */
export type ByProvider = Record<ProviderId, number | null>;

export interface FigureAggregate {
  /** The aggregate, or `null` when no provider gave a value. */
  value: number | null;
  /** How many providers contributed to `value` (0 to 5): "n of 5 providers". */
  providerCount: number;
  /** Source data: every provider's value (`null` = none). */
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

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Even count: the mean of the two middle values. */
function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const hi = sorted[mid] as number;
  return sorted.length % 2 === 1 ? hi : ((sorted[mid - 1] as number) + hi) / 2;
}

function figure(
  byProvider: ByProvider,
  combine: (values: number[]) => number | null,
): FigureAggregate {
  const given = PROVIDERS.flatMap(({ id }) => {
    const v = byProvider[id];
    return v === null ? [] : [v];
  });
  return { value: combine(given), providerCount: given.length, byProvider };
}

export function aggregateRainChance(byProvider: ByProvider): FigureAggregate {
  return figure(byProvider, mean);
}

export function aggregateTemperature(byProvider: ByProvider): FigureAggregate {
  return figure(byProvider, median);
}

/** Median in mph, then converted once to km/h. */
export function aggregateWind(byProvider: ByProvider): WindAggregate {
  const { value, providerCount } = figure(byProvider, median);
  return {
    mph: value,
    kmh: value === null ? null : mphToKmh(value),
    providerCount,
    byProvider,
  };
}
