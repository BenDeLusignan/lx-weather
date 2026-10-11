import type { ReactNode } from "react";
import styles from "./disclosure.module.css";

/**
 * Something the reader only sometimes needs, collapsed behind a line of text
 * with a chevron: a native <details>, so it opens before any JavaScript and
 * keyboards and screen readers get the open/closed state for free.
 */
export function Disclosure({
  summary,
  className,
  children,
}: {
  summary: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details className={className ? `${styles.disclosure} ${className}` : styles.disclosure}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
