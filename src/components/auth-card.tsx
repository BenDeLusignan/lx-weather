import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { Narrow } from "@/components/narrow";
import styles from "./auth-card.module.css";

/**
 * The frame for the pages a visitor sees (log in, sign up): the brand, then
 * the form on a card. There is no header here because there is nobody to
 * navigate for yet; the brand says where you are.
 */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Narrow centred>
      <div className={styles.brand}>
        <BrandMark size="lg" />
        <p className={styles.name}>LX Weather</p>
      </div>
      <div className={styles.card}>
        <h1>{title}</h1>
        {children}
      </div>
    </Narrow>
  );
}
