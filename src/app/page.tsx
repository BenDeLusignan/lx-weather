import { Suspense } from "react";
import { getCurrentUser } from "@/auth/current-user";
import { homeClubOrChoose } from "@/auth/home-club";
import { ClubWeather } from "@/components/club-weather";
import { LoginForm } from "@/components/login-form";
import { PageLoading } from "@/components/loading";

// Logged out: the log in (Core flow 1). Logged in: the home club's week (Core
// flow 2). Which one is only known once the session cookie is read, so the
// page's static shell is just the loading state, and the rest streams in.
export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}

async function Home({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const user = await getCurrentUser();
  if (!user) {
    const { failed, locked } = await searchParams;
    return <LoginForm failed={failed === "1"} locked={locked} />;
  }
  return <ClubWeather club={homeClubOrChoose(user)} home preferences={user.preferences} />;
}
