import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LX Weather",
    template: "%s · LX Weather",
  },
  description:
    "Hour-by-hour playing conditions for tennis clubs in Northern Ireland, from five forecast providers combined.",
};

// The skip link and the header live here so every page has them, the 404
// included. Each page renders its own <main id="main"> (see components/main.tsx).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Suspense fallback={null}>
          <SiteHeader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
