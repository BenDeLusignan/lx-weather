import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
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
// globals.css (light, then dark); update them together.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef4f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1721" },
  ],
};

// The skip link, the header and the one <main> live here so every page has
// them, the 404 included, and a page can't forget them or add a second <main>.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Suspense fallback={null}>
          <SiteHeader />
        </Suspense>
        <main id="main" className={styles.main}>
          {children}
        </main>
      </body>
    </html>
  );
}
