import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/auth/current-user";
import { homeClubOrChoose } from "@/auth/home-club";
import { awayClubs } from "@/clubs/lookup";
import { PageLoading } from "@/components/loading";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Away Game",
  description: "Choose another club to see its week of playing conditions.",
};

export default function AwayPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AwayList />
    </Suspense>
  );
}

// The other clubs, alphabetical by the name shown (Core flow 4).
async function AwayList() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const home = homeClubOrChoose(user);

  return (
    <>
      <h1 className={styles.title}>Away Game</h1>
      <p className={styles.intro}>Choose a club to see its week.</p>
      <ul className={styles.list}>
        {awayClubs(home.id).map((club) => (
          <li key={club.id}>
            <Link href={`/away/${club.id}`} className={styles.link}>
              {club.name}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
