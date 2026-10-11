import type { Metadata } from "next";
import { Button } from "@/components/button";
import { Narrow } from "@/components/narrow";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <Narrow>
      <div className={styles.page}>
        <h1 className={styles.title}>Page not found</h1>
        <p>That page doesn’t exist. It may have moved, or the link may be wrong.</p>
        <div>
          <Button href="/">Back to the home screen</Button>
        </div>
      </div>
    </Narrow>
  );
}
