import type { ReactNode } from "react";
import type { Block } from "@/forecast/blocks";
import {
  formatRainChance,
  formatTemperature,
  formatWind,
  lightMeaning,
  lightWord,
  providerCountNote,
  timeRange,
  unknownReason,
} from "@/weather/format";
import styles from "./block-detail.module.css";
import { Disclosure } from "./disclosure";
import { LightBadge } from "./light-badge";
import { LightIcon } from "./light-icon";
import { SourceTable } from "./source-table";

/**
 * Everything about one hour block: its light in words (with the reason when
 * unknown), the three aggregate figures with their provider counts and, for
 * rain and wind, the light each one gives (so you can see which one made the
 * block's light), and "Expand source data" with the five providers' own
 * figures. A native <details>, so it opens before any JavaScript.
 */
export function BlockDetail({ block, dayHeading }: { block: Block; dayHeading: string }) {
  const range = timeRange(block.startHour);
  return (
    <div className={styles.detail}>
      <h3 className={styles.title}>
        {dayHeading}, {range}
      </h3>
      <p className={styles.verdict}>
        <LightIcon light={block.light} />
        <span>
          <span className={styles.verdictWord}>{lightWord(block.light)}</span>
          {block.light === null ? <> ({unknownReason(block)})</> : null}. {lightMeaning(block.light)}
        </span>
      </p>
      <dl className={styles.figures}>
        <Figure
          label="Temperature"
          value={formatTemperature(block.temperatureC.value)}
          note={providerCountNote(block.temperatureC.providerCount)}
        />
        <Figure
          label="Chance of rain"
          value={formatRainChance(block.rainChancePercent.value)}
          note={providerCountNote(block.rainChancePercent.providerCount)}
          badge={block.rainChancePercent.value === null ? null : <LightBadge light={block.rainLight} />}
        />
        <Figure
          label="Wind"
          value={formatWind(block.wind.mph, block.wind.kmh)}
          note={providerCountNote(block.wind.providerCount)}
          badge={block.wind.mph === null ? null : <LightBadge light={block.windLight} />}
        />
      </dl>
      <p className={styles.why}>The hour’s light is the worse of its rain light and its wind light.</p>
      <Disclosure
        summary={
          <>
            Expand source data<span className="visually-hidden"> for {range}</span>
          </>
        }
      >
        <SourceTable block={block} />
      </Disclosure>
    </div>
  );
}

function Figure({
  label,
  value,
  note,
  badge,
}: {
  label: string;
  value: string;
  note: string | null;
  badge?: ReactNode;
}) {
  return (
    <div className={styles.figure}>
      <dt>{label}</dt>
      <dd>
        <span className={styles.value}>{value}</span>
        {badge}
        {note ? <span className={styles.note}>({note})</span> : null}
      </dd>
    </div>
  );
}
