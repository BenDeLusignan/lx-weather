import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AccountTheme } from "@/components/account-theme";
import { SiteHeader } from "@/components/site-header";
import { THEME_BOOT_SCRIPT } from "@/preferences/theme";
import "./globals.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: {
    default: "LX Weather: tennis weather for Northern Ireland clubs",
    template: "%s · LX Weather",
  },
  description:
    "Hour-by-hour playing conditions for tennis clubs in Northern Ireland, from five forecast providers combined.",
};

// The browser's address bar on a phone. These two mirror --color-bg in
// globals.css (light, then dark); update them together. They can only follow
// the device, not the user's choice on the Account page.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5efff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f0b4d" },
  ],
};

// The skip link, the header and the one <main> live here so every page has
// them, the 404 included, and a page can't forget them or add a second <main>.
//
// The theme (src/preferences/theme.ts): the shell is static, so <html> can't
// carry the user's choice from the server. The inline script in <head> copies
// it from a cookie onto <html data-theme> before the first paint (no flash),
// and AccountTheme brings the page in line with the account once it's known.
// suppressHydrationWarning: the script changes <html> before React hydrates.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Suspense fallback={null}>
          <SiteHeader />
          <AccountTheme />
        </Suspense>
        <main id="main" className={styles.main}>
          {children}
        </main>
      </body>
    </html>
  );
}
