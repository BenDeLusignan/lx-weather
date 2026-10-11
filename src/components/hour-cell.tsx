import type { CSSProperties } from "react";
import type { Block } from "@/forecast/blocks";
import {
  formatRainChance,
  formatWindMph,
  gridColumns,
  hourLabel,
  lightWord,
  NO_DATA_MARK,
  spokenRainChance,
  spokenWindSpeed,
} from "@/weather/format";
import { BlockDetail } from "./block-detail";
import styles from "./hour-cell.module.css";
import { LightIcon } from "./light-icon";

const TONE = { green: "good", yellow: "passable", red: "unlikely" } as const;

/**
 * One hour block in a day's strip: the hour, the light as a shape and a word,
 * and the two figures the light turns on, the chance of rain and the wind in
 * mph (Core flow 3). Both are always there, because a block can be red from
 * the wind with a tiny rain chance and would look wrong with only one. The
 * box never says how many providers made a figure; BlockDetail does. Tapping
 * the box opens that card with the rest.
 *
 * Every box has the same five lines in the same places, so a missing figure is
 * a dash in its own line and nothing moves (the size is fixed in the CSS).
 *
 * `name="hour"` makes the cells one group, so opening an hour closes the one
 * that was open (a browser without that support just lets several open).
 * Tapping the open cell again closes it.
 */
export function HourCell({ block, dayHeading }: { block: Block; dayHeading: string }) {
  const columns = gridColumns(block.startHour);
  const rain = block.rainChancePercent.value;
  const windMph = block.wind.mph;

  return (
    <li
      className={styles.item}
      style={{ "--col-phone": columns.phone, "--col-wide": columns.wide } as CSSProperties}
    >
      <details name="hour" className={styles.details}>
        <summary className={`${styles.cell} ${styles[block.light ? TONE[block.light] : "unknown"]}`}>
          <span className={styles.hour}>
            {hourLabel(block.startHour)}
            <span className="visually-hidden"> to {hourLabel(block.startHour + 1)}</span>
          </span>
          <LightIcon light={block.light} />
          <span className={styles.word}>{lightWord(block.light)}</span>
          {/* The visible text is hidden from screen readers: "%" and "mph" are read badly, so the words below are spoken instead. */}
          <span className={styles.figure} aria-hidden="true">
            {rain === null ? NO_DATA_MARK : formatRainChance(rain)}
          </span>
          <span className={styles.figure} aria-hidden="true">
            {windMph === null ? NO_DATA_MARK : formatWindMph(windMph)}
          </span>
          <span className="visually-hidden">
            , {spokenRainChance(rain)}, {spokenWindSpeed(windMph)}
          </span>
        </summary>
        <div className={styles.card}>
          <BlockDetail block={block} dayHeading={dayHeading} />
        </div>
      </details>
    </li>
  );
}
