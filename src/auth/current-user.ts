import "server-only";
import { cache } from "react";
import { passwordFingerprint, readSession } from "@/auth/session";
import { getUserCredentialsById, type User } from "@/data/users";

/**
 * The logged-in user, or null for a visitor. This is the security boundary:
 * every page that shows account data, and every Server Action that writes
 * it, calls this on the server and refuses when it returns null. Hiding UI
 * from visitors is only cosmetic, and the proxy's cookie check is only the
 * quick one (it can't see a deleted user).
 *
 * Reads the session cookie, so the calling component renders at request
 * time: keep it behind a <Suspense> boundary so the rest of the page stays
 * in the static shell. `cache` makes repeat calls in one request free.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await readSession();
  if (!session) return null;

  const user = await getUserCredentialsById(session.sub);
  // A deleted user, or a password changed since this session started.
  if (!user || passwordFingerprint(user.passwordHash) !== session.pwd) return null;
  return { id: user.id, email: user.email, homeClubId: user.homeClubId, preferences: user.preferences };
});
