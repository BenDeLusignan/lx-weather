import "server-only";
import { redirect } from "next/navigation";
import type { Club } from "@/clubs/clubs";
import { findClub } from "@/clubs/lookup";
import type { User } from "@/data/users";

/**
 * The user's home club. A stored id that is no longer in `CLUBS` sends them to
 * Account to choose again, never to a crash or a blank screen. Used by every
 * screen that needs the home club.
 */
export function homeClubOrChoose(user: User): Club {
  const club = findClub(user.homeClubId);
  if (!club) redirect("/account");
  return club;
}
