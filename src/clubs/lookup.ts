import { CLUBS, type Club } from "./clubs";

const byId = new Map(CLUBS.map((club) => [club.id, club] as const));

/** Alphabetical by the name shown (vision, Core flow 4). Sorted once; never mutated. */
const byName: readonly Club[] = [...CLUBS].sort((a, b) => a.name.localeCompare(b.name, "en-GB"));

export function findClub(id: unknown): Club | undefined {
  return typeof id === "string" ? byId.get(id) : undefined;
}

/** Whether `id` names a club in `CLUBS`. The check behind every write of a home club. */
export function isClubId(id: unknown): id is string {
  return findClub(id) !== undefined;
}

/** Every club, alphabetical by displayed name: the choices on sign-up and Account. */
export function clubsByName(): readonly Club[] {
  return byName;
}

/**
 * The Away Game list: every club except the user's own home club, alphabetical
 * by displayed name. A home club id that isn't in `CLUBS` excludes nothing.
 */
export function awayClubs(homeClubId: string): Club[] {
  return byName.filter((club) => club.id !== homeClubId);
}
