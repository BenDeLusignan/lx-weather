import { getCurrentUser } from "@/auth/current-user";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/button";
import { ThemeSwitch } from "@/components/theme-switch";
import styles from "./site-header.module.css";

/**
 * The banner on every logged-in screen: the site name (a link home), the
 * light/dark switch and an Account button (Core flow 5), always at the top. For
 * a visitor it renders nothing, so the log in and sign up pages stand alone
 * (and, with no header, have no switch: they follow the device).
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
        {/* The way back to the club's week, so it carries the brand mark. The visible words are its accessible name. */}
        <Button href="/" variant="quiet">
          <BrandMark />
          {/*
            The words stay real text. The weights and sizes are CSS
            (site-header.module.css, which also says why the wordmark must not
            change on hover), and the space between the spans keeps the
            accessible name "LX Tennis Weather".
          */}
          <span className={styles.wordmark}>
            <span className={styles.lx}>LX</span> <span className={styles.name}>Tennis Weather</span>
          </span>
        </Button>
        <div className={styles.actions}>
          <ThemeSwitch theme={user.preferences.theme} />
          <Button href="/account" variant="quiet">
            Account
          </Button>
        </div>
      </nav>
    </header>
  );
}
