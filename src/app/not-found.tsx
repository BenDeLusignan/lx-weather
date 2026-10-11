import type { Metadata } from "next";
import Link from "next/link";
import { Main } from "@/components/main";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <Main>
      <h1>Page not found</h1>
      <p>That page doesn’t exist.</p>
      <p>
        <Link href="/">Back to the home screen</Link>
      </p>
    </Main>
  );
}
