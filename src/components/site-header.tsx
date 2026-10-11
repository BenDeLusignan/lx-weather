import { getCurrentUser } from "@/auth/current-user";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/button";
import styles from "./site-header.module.css";

/**
 * The banner on every logged-in screen: a Home button and an Account button
 * (Core flow 5), always at the top. For a visitor it renders nothing, so the
 * log in and sign up pages stand alone.
 *
 * It lives in the root layout, so every page gets it, the 404 included, and a
 * page can't forget it. Reading the session makes it request-time, so the
 * layout puts it behind <Suspense> and the rest of each page stays in the
 * static shell.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <header className={styles.header}>
      <nav aria-label="Main" className={styles.nav}>
        {/* Home is the way back to the club's week, so it carries the brand mark. */}
        <Button href="/" variant="quiet">
          <BrandMark />
          Home
        </Button>
        <Button href="/account" variant="quiet">
          Account
        </Button>
      </nav>
    </header>
  );
}
