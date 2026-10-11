import Link from "next/link";
import { getCurrentUser } from "@/auth/current-user";
import styles from "./site-header.module.css";

/**
 * The banner on every logged-in screen: Home and Account (Core flow 5). For a
 * visitor it renders nothing, so the log in and sign up pages stand alone.
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
        <ul className={styles.list}>
          <li>
            <Link href="/" className={styles.link}>
              Home
            </Link>
          </li>
          <li>
            <Link href="/account" className={styles.link}>
              Account
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
