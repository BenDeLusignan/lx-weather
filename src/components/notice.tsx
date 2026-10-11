import type { ReactNode } from "react";
import styles from "./notice.module.css";

/**
 * A plain statement about the data on the page: `info` for a neutral fact,
 * `warning` when part of it is missing (a provider is down), `problem` when
 * nothing can be shown. The colour only tints the edge; the words carry the
 * meaning. Pass `role="status"` for one that appears while the reader is
 * already on the page.
 */
export function Notice({
  tone = "info",
  role,
  children,
}: {
  tone?: "info" | "warning" | "problem";
  role?: "status";
  children: ReactNode;
}) {
  return (
    <p role={role} className={tone === "info" ? styles.notice : `${styles.notice} ${styles[tone]}`}>
      {children}
    </p>
  );
}
