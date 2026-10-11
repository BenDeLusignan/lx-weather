import "server-only";
import { and, eq } from "drizzle-orm";
import { isClubId } from "@/clubs/lookup";
import { getDb } from "@/db/client";
import { user } from "@/db/schema";
import {
  daysToMask,
  hoursToMask,
  isThemeChoice,
  isValidDays,
  isValidHours,
  preferencesFromRow,
  type Preferences,
} from "@/preferences/preferences";

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
  /** Theme, days and hours: what a new account or an old row gets is `DEFAULT_PREFERENCES`. */
  preferences: Preferences;
}

export interface UserCredentials extends User {
  passwordHash: string;
}

const credentialsColumns = {
  id: user.id,
  email: user.email,
  homeClubId: user.homeClubId,
  passwordHash: user.passwordHash,
  theme: user.theme,
  days: user.days,
  hours: user.hours,
};

type CredentialsRow = Pick<
  typeof user.$inferSelect,
  "id" | "email" | "homeClubId" | "passwordHash" | "theme" | "days" | "hours"
>;

function toCredentials(row: CredentialsRow): UserCredentials {
  return {
    id: row.id,
    email: row.email,
    homeClubId: row.homeClubId,
    passwordHash: row.passwordHash,
    preferences: preferencesFromRow(row),
  };
}

/** Emails are stored trimmed and lowercased, and matched the same way. */
function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserCredentialsByEmail(email: string): Promise<UserCredentials | undefined> {
  const [row] = await getDb()
    .select(credentialsColumns)
    .from(user)
    .where(eq(user.email, normaliseEmail(email)));
  return row && toCredentials(row);
}

export async function getUserCredentialsById(id: number): Promise<UserCredentials | undefined> {
  const [row] = await getDb().select(credentialsColumns).from(user).where(eq(user.id, id));
  return row && toCredentials(row);
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
    return { result: "created" as const, user: toCredentials(created) };
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

/**
 * Replaces a user's password hash, but only if it is still `expectedHash`.
 * One conditional UPDATE, so it is atomic: of two changes that both started
 * from the same old hash only one can match the row, and the other gets
 * `stale` and writes nothing. (A read, a check and a write in separate steps
 * would let both through.)
 */
export async function changePasswordHash(
  userId: number,
  expectedHash: string,
  newHash: string,
): Promise<"changed" | "stale" | "not-found"> {
  const db = getDb();
  const updated = await db
    .update(user)
    .set({ passwordHash: newHash })
    .where(and(eq(user.id, userId), eq(user.passwordHash, expectedHash)))
    .returning({ id: user.id });
  if (updated.length > 0) return "changed";
  // No row matched: either the hash moved on, or the account is gone.
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));
  return row ? "stale" : "not-found";
}

/**
 * Changes some of a user's settings; only the parts given are written. Every
 * part is re-checked here, at the write, whatever the caller did: an unknown
 * theme, or an empty or out-of-range day or hour list, is refused and nothing
 * is changed (the table's CHECKs are the last backstop).
 */
export async function updatePreferences(
  userId: number,
  changes: Partial<Preferences>,
): Promise<"saved" | "invalid" | "not-found"> {
  const { theme, days, hours } = changes;
  if (theme !== undefined && !isThemeChoice(theme)) return "invalid";
  if (days !== undefined && !isValidDays(days)) return "invalid";
  if (hours !== undefined && !isValidHours(hours)) return "invalid";

  const set = {
    ...(theme !== undefined && { theme }),
    ...(days !== undefined && { days: daysToMask(days) }),
    ...(hours !== undefined && { hours: hoursToMask(hours) }),
  };
  // Nothing to write is not a save.
  if (Object.keys(set).length === 0) return "invalid";

  const updated = await getDb().update(user).set(set).where(eq(user.id, userId)).returning({ id: user.id });
  return updated.length > 0 ? "saved" : "not-found";
}
