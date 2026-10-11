import type { ReactNode } from "react";
import styles from "./main.module.css";

/**
 * The page's one <main id="main">, which the skip link in the root layout
 * jumps to. Every page renders exactly one, so a page can't forget the target
 * or have two.
 */
export function Main({ children }: { children: ReactNode }) {
  return (
    <main id="main" className={styles.main}>
      {children}
    </main>
  );
}
