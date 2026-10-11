import { LightBadge } from "./light-badge";
import styles from "./light-key.module.css";

/**
 * The four lights with their shapes and words, once above the week, so the
 * shapes in the cells can be learned at a glance. The word is in every cell
 * as well: the key helps, but nobody has to find it.
 */
export function LightKey() {
  return (
    <div className={styles.key}>
      <p className={styles.title}>Key</p>
      <ul className={styles.list}>
        <li>
          <LightBadge light="green" />
        </li>
        <li>
          <LightBadge light="yellow" />
        </li>
        <li>
          <LightBadge light="red" />
        </li>
        <li>
          <LightBadge light={null} />
        </li>
      </ul>
    </div>
  );
}
