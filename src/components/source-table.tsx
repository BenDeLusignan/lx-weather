import type { Block } from "@/forecast/blocks";
import { PROVIDERS } from "@/forecast/providers";
import { mphToKmh } from "@/forecast/aggregate";
import { formatRainChance, formatTemperature, formatWindParts, timeRange } from "@/weather/format";
import styles from "./source-table.module.css";

function NoData() {
  return <span className={styles.noData}>no data</span>;
}

/**
 * What each of the five providers says for this block (Product rule 1), in
 * their own figures. A provider with a gap says "no data" in that cell, so a
 * missing figure is never mistaken for a zero or quietly left out.
 */
export function SourceTable({ block }: { block: Block }) {
  return (
    <table className={styles.table}>
      <caption className="visually-hidden">What each provider says for {timeRange(block.startHour)}</caption>
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
          const temperature = block.temperatureC.byProvider[id];
          const rain = block.rainChancePercent.byProvider[id];
          const mph = block.wind.byProvider[id];
          const wind = formatWindParts(mph, mph === null ? null : mphToKmh(mph));
          return (
            <tr key={id}>
              <th scope="row">{label}</th>
              <td>{temperature === null ? <NoData /> : formatTemperature(temperature)}</td>
              <td>{rain === null ? <NoData /> : formatRainChance(rain)}</td>
              <td>
                {wind === null ? (
                  <NoData />
                ) : (
                  <>
                    <span className={styles.unit}>{wind.mph}</span>
                    <span className={styles.unit}>{wind.kmh}</span>
                  </>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
