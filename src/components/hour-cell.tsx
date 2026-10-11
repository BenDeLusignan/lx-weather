import type { CSSProperties } from "react";
import type { Block } from "@/forecast/blocks";
import { PROVIDER_TOTAL } from "@/forecast/providers";
import { formatRainChance, gridColumns, hourLabel, lightWord, providerCountNote } from "@/weather/format";
import { BlockDetail } from "./block-detail";
import styles from "./hour-cell.module.css";
import { LightIcon } from "./light-icon";

const TONE = { green: "good", yellow: "passable", red: "unlikely" } as const;

/**
 * One hour block in a day's strip: the hour, the light as a shape and a word,
 * and the chance of rain, the figure the light mostly turns on. Tapping it
 * opens a card with the rest (BlockDetail).
 *
 * `name="hour"` makes the cells one group, so opening an hour closes the one
 * that was open (a browser without that support just lets several open).
 * Tapping the open cell again closes it.
 */
export function HourCell({ block, dayHeading }: { block: Block; dayHeading: string }) {
  const columns = gridColumns(block.startHour);
  const rain = block.rainChancePercent;
  const rainNote = providerCountNote(rain.providerCount);

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
          <span className={styles.rain}>
            {rain.value === null ? "–" : formatRainChance(rain.value)}
            <span className="visually-hidden"> {rain.value === null ? "no rain data" : "chance of rain"}</span>
          </span>
          {rainNote ? (
            <span className={styles.count}>
              {rain.providerCount} of {PROVIDER_TOTAL}<span className="visually-hidden"> providers</span>
            </span>
          ) : null}
        </summary>
        <div className={styles.card}>
          <BlockDetail block={block} dayHeading={dayHeading} />
        </div>
      </details>
    </li>
  );
}
