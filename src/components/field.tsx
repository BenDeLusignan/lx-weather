import type { ReactNode } from "react";
import styles from "./field.module.css";

/** The id of a Field's hint, for the control's `aria-describedby`. */
export function hintId(id: string): string {
  return `${id}-hint`;
}

/** Joins the ids a control is described by; skips the ones that don't apply. */
export function describedBy(...ids: (string | false | undefined)[]): string | undefined {
  const present = ids.filter(Boolean);
  return present.length > 0 ? present.join(" ") : undefined;
}

/**
 * A form control with its visible label and an optional hint, tied together
 * for assistive tech. `id` is the control's id: make it unique per form
 * ("login-email", not "email"), because Next keeps the page you just left in
 * the DOM (hidden) while you navigate, and two controls with one id make a
 * label point at the wrong one.
 */
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
        <p id={hintId(id)} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** The class every text input and select shares. */
export const controlClassName = styles.control;
