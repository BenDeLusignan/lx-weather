import styles from "./brand-mark.module.css";

// Three tennis balls falling down a diagonal from the cloud, growing as they
// fall (centre and radius in the 64 viewBox). Same numbers as src/app/icon.svg.
const BALLS = [
  { cx: 23, cy: 36, r: 6 },
  { cx: 35, cy: 45, r: 6.5 },
  { cx: 47.5, cy: 54.5, r: 7.5 },
];

/**
 * The app icon as a small inline picture: a cloud raining tennis balls on a
 * diagonal. It's the same artwork as src/app/icon.svg, drawn with the colour
 * tokens instead of the hex values the static file has to use; change both
 * together (and re-render apple-icon.png). The tile is the CSS background of
 * the <svg> itself (brand-mark.module.css), not a gradient inside it: an inline
 * <svg> has no id of its own, and two gradients with the same id break when the
 * first copy sits in a hidden page that Next keeps in the DOM.
 * Decorative: whatever sits beside it carries the name.
 */
export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={`${styles.mark} ${styles[size]}`}>
      {BALLS.map(({ cx, cy, r }) => (
        // The ball and its two seams are drawn once at radius 13 and scaled to each ball's own size.
        <g key={cx} transform={`translate(${cx} ${cy}) scale(${r / 13})`}>
          <circle r="13" className={styles.ball} />
          <path
            d="M-8.8-8.5c4.5 3.5 4.5 13 0 17M8.8-8.5c-4.5 3.5-4.5 13 0 17"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            className={styles.seams}
          />
        </g>
      ))}
      <g className={styles.cloud}>
        <rect x="8" y="14" width="44" height="13" rx="6.5" />
        <circle cx="22" cy="15" r="8.5" />
        <circle cx="36" cy="13.5" r="10.5" />
      </g>
    </svg>
  );
}
