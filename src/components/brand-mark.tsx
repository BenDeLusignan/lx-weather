import styles from "./brand-mark.module.css";

// Eight rays round the ball, as one path of eight strokes (the 64 viewBox,
// centred on 32 32, from 17 out to 22.5, 6.5 wide). The same string as src/app/icon.svg.
const RAYS =
  "M32 15L32 9.5M44.02 19.98L47.91 16.09M49 32L54.5 32M44.02 44.02L47.91 47.91M32 49L32 54.5M19.98 44.02L16.09 47.91M15 32L9.5 32M19.98 19.98L16.09 16.09";

/**
 * The app icon as a small inline picture: a tennis ball acting as the sun,
 * with a ring of rays round it. It's the same artwork as src/app/icon.svg,
 * drawn with the colour tokens instead of the hex values the static file has to
 * use; change both together (and re-render apple-icon.png). The tile is the CSS
 * background of the <svg> itself (brand-mark.module.css), not a gradient inside
 * it: an inline <svg> has no id of its own, and two gradients with the same id
 * break when the first copy sits in a hidden page that Next keeps in the DOM.
 * Decorative: whatever sits beside it carries the name.
 */
export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={`${styles.mark} ${styles[size]}`}>
      <path d={RAYS} fill="none" strokeWidth="6.5" strokeLinecap="round" className={styles.rays} />
      <g transform="translate(32 32)">
        <circle r="11" className={styles.ball} />
        <path
          d="M-7.5-7.2c3.8 3 3.8 11 0 14.4M7.5-7.2c-3.8 3-3.8 11 0 14.4"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
          className={styles.seams}
        />
      </g>
    </svg>
  );
}
