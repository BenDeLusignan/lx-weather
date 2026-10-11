import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./button.module.css";

/**
 * A button, or with `href` a link that looks like one. Use a button for
 * anything that changes data (a form's submit), a link for going somewhere.
 */
export function Button({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.button}>
      {children}
    </Link>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button type="submit" className={styles.button}>
      {children}
    </button>
  );
}
