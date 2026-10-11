import type { ReactNode } from "react";
import styles from "./narrow.module.css";

/**
 * A reading-width column for the pages that are forms or short lists (log in,
 * sign up, account, away list, 404). The week screen is wide and doesn't use
 * it. *Why:* a form stretched across a 1280px screen is harder to use, not
 * easier, and the one width is decided here instead of on every page.
 */
export function Narrow({ children, centred = false }: { children: ReactNode; centred?: boolean }) {
  return <div className={centred ? `${styles.narrow} ${styles.centred}` : styles.narrow}>{children}</div>;
}
