import type { Metadata, Viewport } from "next";
import { Orbitron } from "next/font/google";
import { Suspense } from "react";
import { AccountTheme } from "@/components/account-theme";
import { SiteHeader } from "@/components/site-header";
import { THEME_BOOT_SCRIPT } from "@/preferences/theme";
import "./globals.css";
import styles from "./layout.module.css";

// The wordmark's display face, the same one LX Tennis uses for its brand
// (vision, Theme). Self-hosted by next/font, so no request goes to Google when
// someone visits. It is only used by the header, so the logged-out pages never
// show it; `--font-display` in globals.css names it with a system fallback.
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LX Weather: tennis weather for Northern Ireland clubs",
    template: "%s · LX Weather",
  },
  description:
    "Hour-by-hour playing conditions for tennis clubs in Northern Ireland, from five forecast providers combined.",
};

// The browser's address bar on a phone. These two mirror --color-header-bg in
// globals.css (light, then dark; the bar sits right above the header on every
// logged-in screen); update them together. They can only follow the device,
// not the user's choice with the header's light/dark switch.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7ab8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
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
    <html lang="en-GB" className={orbitron.variable} suppressHydrationWarning>
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
