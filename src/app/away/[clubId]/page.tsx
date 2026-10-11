import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/auth/current-user";
import { homeClubOrChoose } from "@/auth/home-club";
import { CLUBS } from "@/clubs/clubs";
import { findClub } from "@/clubs/lookup";
import { ClubWeather } from "@/components/club-weather";
import { PageLoading } from "@/components/loading";

// Every club is a known path. Cache Components doesn't allow
// `dynamicParams = false`, so an unknown id renders on request and gets its
// 404 from notFound() below.
//
// `instant = false`: the page awaits `params` at the top, which only blocks
// for ids not in this list, and those are all 404s. Wrapping the page in
// <Suspense> instead would stream the 404 inside a 200.
export const instant = false;

export function generateStaticParams() {
  return CLUBS.map((club) => ({ clubId: club.id }));
}

export async function generateMetadata({ params }: PageProps<"/away/[clubId]">): Promise<Metadata> {
  const club = findClub((await params).clubId);
  return club
    ? { title: `${club.name} (away)`, description: `Hour-by-hour playing conditions at ${club.name} for the next week.` }
    : {};
}

export default async function AwayClubPage({ params }: PageProps<"/away/[clubId]">) {
  const club = findClub((await params).clubId);
  if (!club) notFound();

  return (
    <Suspense fallback={<PageLoading />}>
      <AwayClub clubId={club.id} />
    </Suspense>
  );
}

// The same screen as the home screen, with this club (Core flow 4). Your own
// home club is the home screen, so it goes there.
async function AwayClub({ clubId }: { clubId: string }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (homeClubOrChoose(user).id === clubId) redirect("/");

  const club = findClub(clubId);
  if (!club) notFound();
  return <ClubWeather club={club} home={false} preferences={user.preferences} />;
}
