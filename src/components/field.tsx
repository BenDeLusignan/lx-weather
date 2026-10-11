import type { ReactNode } from "react";
import styles from "./field.module.css";

/** A form control with its visible label and an optional hint, tied together for assistive tech. */
export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** The class every text input and select shares. */
export const controlClassName = styles.control;
