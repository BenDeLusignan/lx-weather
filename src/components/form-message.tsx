import type { ReactNode } from "react";
import styles from "./form-message.module.css";

/**
 * The result of a form, read from a URL flag after the action's redirect.
 * `error` says what to fix and that nothing was saved; `success` confirms.
 * An error is announced to screen readers as it appears (role="alert").
 */
export function FormMessage({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`${styles.message} ${styles[tone]}`}>
      {children}
    </p>
  );
}
