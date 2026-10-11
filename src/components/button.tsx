import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "quiet";

function className(variant: ButtonVariant): string {
  return `${styles.button} ${styles[variant]}`;
}

/**
 * A link that looks like a button, for going somewhere. Anything that changes
 * data is a form with a SubmitButton instead.
 * `primary` is the screen's one main action (filled), `secondary` any other
 * (outlined), `quiet` is for the header, where it must not compete with the
 * page.
 */
export function Button({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className(variant)}>
      {children}
    </Link>
  );
}

export function SubmitButton({
  variant = "primary",
  children,
}: {
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  return (
    <button type="submit" className={className(variant)}>
      {children}
    </button>
  );
}
