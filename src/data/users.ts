import "server-only";
import { eq } from "drizzle-orm";
import { isClubId } from "@/clubs/lookup";
import { getDb } from "@/db/client";
import { user } from "@/db/schema";

/**
 * Accounts. The `...Credentials` readers return the password hash and exist
 * only for `src/auth`; pages and components get a `User`, which never
 * carries it.
 */

export interface User {
  id: number;
  email: string;
  /** A club id as stored. It may no longer be in `CLUBS`: check with `findClub`. */
  homeClubId: string;
}

export interface UserCredentials extends User {
  passwordHash: string;
}

const credentialsColumns = {
  id: user.id,
  email: user.email,
  homeClubId: user.homeClubId,
  passwordHash: user.passwordHash,
};

/** Emails are stored trimmed and lowercased, and matched the same way. */
function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserCredentialsByEmail(email: string): Promise<UserCredentials | undefined> {
  const [row] = await getDb()
    .select(credentialsColumns)
    .from(user)
    .where(eq(user.email, normaliseEmail(email)));
  return row;
}

export async function getUserCredentialsById(id: number): Promise<UserCredentials | undefined> {
  const [row] = await getDb().select(credentialsColumns).from(user).where(eq(user.id, id));
  return row;
}

/**
 * Creates an account. Refuses an email that's taken, and a home club that
 * isn't in `CLUBS` (checked here, at the write, whatever the caller did).
 * The check and the insert share one write transaction, so two sign-ups with
 * the same email can't both pass; the unique constraint in the schema stays
 * as the backstop.
 */
export async function createUser(input: {
  email: string;
  passwordHash: string;
  homeClubId: string;
}): Promise<{ result: "created"; user: UserCredentials } | { result: "email-used" } | { result: "unknown-club" }> {
  if (!isClubId(input.homeClubId)) return { result: "unknown-club" };
  const email = normaliseEmail(input.email);

  return getDb().transaction(async (tx) => {
    const [existing] = await tx.select({ id: user.id }).from(user).where(eq(user.email, email));
    if (existing) return { result: "email-used" as const };

    const [created] = await tx
      .insert(user)
      .values({ email, passwordHash: input.passwordHash, homeClubId: input.homeClubId })
      .returning(credentialsColumns);
    if (!created) throw new Error("Insert returned no row");
    return { result: "created" as const, user: created };
  });
}

/**
 * Changes a user's home club. Refuses an id that isn't in `CLUBS` (checked
 * here, at the write).
 */
export async function setHomeClub(
  userId: number,
  homeClubId: string,
): Promise<"saved" | "unknown-club" | "not-found"> {
  if (!isClubId(homeClubId)) return "unknown-club";
  const updated = await getDb()
    .update(user)
    .set({ homeClubId })
    .where(eq(user.id, userId))
    .returning({ id: user.id });
  return updated.length > 0 ? "saved" : "not-found";
}
