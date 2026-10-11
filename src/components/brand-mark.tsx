import styles from "./brand-mark.module.css";

/**
 * The app icon as a small inline picture: a cloud above a tennis ball. It's
 * the same artwork as src/app/icon.svg, drawn with the colour tokens instead
 * of the hex values the static file has to use; change both together.
 * Decorative: whatever sits beside it carries the name.
 */
export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={`${styles.mark} ${styles[size]}`}>
      <rect width="64" height="64" rx="14" className={styles.bg} />
      <circle cx="32" cy="46" r="13" className={styles.ball} />
      <path
        d="M23.2 37.5c4.5 3.5 4.5 13 0 17M40.8 37.5c-4.5 3.5-4.5 13 0 17"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={styles.seams}
      />
      <g className={styles.cloud}>
        <rect x="10" y="17" width="44" height="12" rx="6" />
        <circle cx="24" cy="18" r="8" />
        <circle cx="36" cy="16" r="10" />
      </g>
    </svg>
  );
}
