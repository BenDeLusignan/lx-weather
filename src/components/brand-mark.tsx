import styles from "./brand-mark.module.css";

/**
 * The app icon as a small inline picture: a tennis ball behind a cloud. It's
 * the same artwork as src/app/icon.svg, drawn with the colour tokens instead
 * of the hex values the static file has to use; change both together.
 * Decorative: whatever sits beside it carries the name.
 */
export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={`${styles.mark} ${styles[size]}`}>
      <rect width="64" height="64" rx="14" className={styles.bg} />
      <circle cx="40" cy="25" r="14" className={styles.ball} />
      <path
        d="M30.5 15.5c5 4 5 15 0 19M49.5 15.5c-5 4-5 15 0 19"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={styles.seams}
      />
      <g className={styles.cloud}>
        <rect x="12" y="43" width="42" height="12" rx="6" />
        <circle cx="25" cy="43" r="8.5" />
        <circle cx="38" cy="39" r="11" />
      </g>
    </svg>
  );
}
