import type { Light } from "@/forecast/blocks";
import { lightWord } from "@/weather/format";
import { LightIcon } from "./light-icon";
import styles from "./light-badge.module.css";

const TONE = { green: "good", yellow: "passable", red: "unlikely" } as const;

/** A light as a small pill: its shape and its word, on its own tint. Used in the key and next to a figure. */
export function LightBadge({ light }: { light: Light | null }) {
  return (
    <span className={`${styles.badge} ${styles[light ? TONE[light] : "unknown"]}`}>
      <LightIcon light={light} size="small" />
      {lightWord(light)}
    </span>
  );
}
