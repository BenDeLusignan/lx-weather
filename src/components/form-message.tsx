"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./form-message.module.css";

/**
 * The result of submitting a form, read from a URL flag after the action's
 * redirect. `error` says what to fix and that nothing was saved; `success`
 * confirms.
 *
 * The redirect is a full page load, so a screen reader hears nothing new:
 * `role="alert"` only announces changes. Focus moves to the message instead,
 * which reads it out and scrolls it into view. Before JavaScript loads (or
 * without it) it is simply the message, at the top of the form.
 */
export function FormMessage({
  tone,
  id,
  children,
}: {
  tone: "error" | "success";
  /** Lets a field point at the message with `aria-describedby`. */
  id?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <p ref={ref} id={id} tabIndex={-1} className={`${styles.message} ${styles[tone]}`}>
      {children}
    </p>
  );
}
