import type { Light } from "@/forecast/blocks";
import styles from "./light-icon.module.css";

type Shape = "good" | "passable" | "unlikely" | "unknown";

function shapeOf(light: Light | null): Shape {
  switch (light) {
    case "green":
      return "good";
    case "yellow":
      return "passable";
    case "red":
      return "unlikely";
    case null:
      return "unknown";
  }
}

/**
 * The traffic light as a shape, so it never depends on colour: a circle with
 * a tick (good), a triangle with an exclamation mark (passable), a square with
 * a cross (unlikely), a dashed empty ring with a question mark (unknown).
 * Decorative: the word beside it ("Good", ...) is what's read out. The colours
 * are the --light-* tokens (globals.css has their contrast ratios).
 */
export function LightIcon({ light, size = "md" }: { light: Light | null; size?: "md" | "small" }) {
  const shape = shapeOf(light);
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={`${styles.icon} ${styles[shape]} ${size === "small" ? styles.small : ""}`}
    >
      {shape === "good" ? (
        <>
          <circle cx="12" cy="12" r="10.5" className={styles.shape} />
          <path d="M7 12.5l3.2 3.2L17 8.8" className={styles.mark} />
        </>
      ) : null}
      {shape === "passable" ? (
        <>
          <path d="M12 2.8L22.4 20.6H1.6Z" className={styles.shape} />
          <path d="M12 9.2v5.2" className={styles.mark} />
          <circle cx="12" cy="17.4" r="1.3" className={styles.dot} />
        </>
      ) : null}
      {shape === "unlikely" ? (
        <>
          <rect x="2" y="2" width="20" height="20" rx="4.5" className={styles.shape} />
          <path d="M8 8l8 8M16 8l-8 8" className={styles.mark} />
        </>
      ) : null}
      {shape === "unknown" ? (
        <>
          <circle cx="12" cy="12" r="9.8" className={styles.shape} />
          <path d="M9.4 9.6a2.7 2.7 0 1 1 3.9 2.4c-.9.5-1.3 1-1.3 2" className={styles.mark} />
          <circle cx="12" cy="17.2" r="1.2" className={styles.dot} />
        </>
      ) : null}
    </svg>
  );
}
