import "server-only";
import { loginAttemptKeys, signUpAttemptKeys, type AttemptKeys } from "@/auth/attempt-keys";
import { hashPassword, verifyPassword } from "@/auth/password";
import { isClubId } from "@/clubs/lookup";
import { admitAttempt, settleSuccess, type Reservation } from "@/data/attempts";
import { lockoutWaitMinutes } from "@/data/attempt-rules";
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/data/limits";
import { createUser, getUserCredentialsByEmail, setHomeClub, type User } from "@/data/users";
import { parseEmail } from "@/forms/fields";
import type { ThemeChoice } from "@/preferences/preferences";

/**
 * What each Server Action in `src/auth/actions.ts` does, given the posted
 * form: where to redirect and, for a login or sign-up, which session to
 * start. Split out so tests can run them with a fixed clock and address.
 */

/**
 * What a submit function needs to run the failed-attempt limiter. Both are
 * passed in rather than read here: the Server Action reads the real clock
 * and the request's headers, and a test moves the clock and names the
 * addresses itself, with no sleeping and no invented request headers.
 */
export interface AttemptContext {
  /** Unix seconds. */
  now: number;
  /** The client's address (`clientIp`), or null when no trusted header carried one. */
  ip: string | null;
}

/** The session a successful login or sign-up starts. */
export interface SessionToStart {
  id: number;
  passwordHash: string;
  /** Their stored theme, so the device's theme cookie matches the account it is now logged in to. */
  theme: ThemeChoice;
}

export interface SubmitResult {
  /** Where to go. Errors are a flag in the URL, never what the user typed. */
  redirect: string;
  /** Set when the credentials were right; the action starts the session. */
  session?: SessionToStart;
}

/**
 * The limiter's gate in front of every password check and every sign-up.
 * Either the attempt is admitted, and has been counted already, or it's
 * refused: `minutes` is the wait for a lockout, or null when the counters
 * couldn't be written.
 *
 * A refused attempt never reaches `verifyPassword`: while locked, even the
 * right password must not get through, or a guesser would learn when they
 * hit it. And a limiter that can't be written fails closed: the attempt is
 * refused, never let through uncounted.
 */
async function admit(
  keys: AttemptKeys,
  now: number,
): Promise<{ admitted: true; reservation: Reservation } | { admitted: false; minutes: number | null }> {
  try {
    const admission = await admitAttempt(keys.pair, keys.ip, now);
    if (admission.admitted) return admission;
    return { admitted: false, minutes: lockoutWaitMinutes(admission.remainingSeconds) };
  } catch {
    return { admitted: false, minutes: null };
  }
}

/**
 * The attempt turned out fine: forget the (email, address) counter and give
 * back the attempt the address counter was charged. If that write fails the
 * attempt still counts as made, which is the safe side, and a correct
 * password isn't turned away for it.
 */
async function settle(reservation: Reservation): Promise<void> {
  try {
    await settleSuccess(reservation);
  } catch {
    // Nothing to do: the counters only ever err towards locking sooner.
  }
}

/** `minutes` is null when the limiter couldn't be written: sent as 0, which the page words as an outage. */
function lockedPath(page: "/" | "/signup", minutes: number | null): string {
  return `${page}?locked=${minutes ?? 0}`;
}

/**
 * Log in. An unknown email and a wrong password are indistinguishable: both
 * get the same `/?failed=1` redirect, and both cost one full scrypt run
 * (`verifyPassword` runs the same scrypt against nothing when there's no
 * stored hash, so an unknown email isn't the cheap one). They're also counted
 * the same way, before the email is even looked up, so a lockout never says
 * whether an account exists. The email never reaches the URL.
 */
export async function submitLogin(formData: FormData, context: AttemptContext): Promise<SubmitResult> {
  // `unknown` until checked: a hand-made request can send anything. The
  // typed email is bounded before it's hashed into a limiter key, and the
  // password before scrypt sees it. Anything that isn't a stored email fails
  // the same way and is counted the same way.
  const typed = formData.get("email");
  const email = (typeof typed === "string" ? typed : "").slice(0, EMAIL_MAX_LENGTH);
  const postedPassword = formData.get("password");
  const password =
    typeof postedPassword === "string" && postedPassword.length <= PASSWORD_MAX_LENGTH ? postedPassword : "";

  const gate = await admit(loginAttemptKeys(email, context.ip), context.now);
  if (!gate.admitted) return { redirect: lockedPath("/", gate.minutes) };

  const user = await getUserCredentialsByEmail(email);
  // Always runs scrypt, even for an unknown email, so response time doesn't give it away.
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? null);
  // The failure is already counted (see `admit`), so nothing more to record.
  if (!user || !passwordMatches) return { redirect: "/?failed=1" };

  await settle(gate.reservation);
  return { redirect: "/", session: { id: user.id, passwordHash: user.passwordHash, theme: user.preferences.theme } };
}

/** The refusal codes `/signup?error=` can carry, each with its own message on the page. */
export type SignUpError = "email" | "password" | "club" | "failed";

function signUpRefused(error: SignUpError): SubmitResult {
  return { redirect: `/signup?error=${error}` };
}

/**
 * Sign up: email, password and a home club from the list; signing up logs
 * you in. Nothing is written until every check has passed.
 *
 * The checks that don't touch the database (a valid-looking email, a long
 * enough password, a club in `CLUBS`) come first and say what to fix: they
 * can't reveal anything about other accounts. Then the attempt is counted,
 * and an email that's already taken gets the same generic `failed` as any
 * other refusal that depends on the database, counted as a failure and after
 * the same scrypt run as a success, so neither the message nor the timing
 * says which it was. (Without email verification a sign-up refusal can still
 * be read as "that email has an account"; the counters make probing slow, not
 * impossible.)
 */
export async function submitSignUp(formData: FormData, context: AttemptContext): Promise<SubmitResult> {
  const email = parseEmail(formData.get("email"));
  if (!email) return signUpRefused("email");

  const password = formData.get("password");
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return signUpRefused("password");
  }

  const homeClubId = formData.get("homeClub");
  if (!isClubId(homeClubId)) return signUpRefused("club");

  const gate = await admit(signUpAttemptKeys(email, context.ip), context.now);
  if (!gate.admitted) return { redirect: lockedPath("/signup", gate.minutes) };

  const passwordHash = await hashPassword(password);
  const created = await createUser({ email, passwordHash, homeClubId });
  if (created.result === "unknown-club") return signUpRefused("club");
  if (created.result === "email-used") return signUpRefused("failed");

  await settle(gate.reservation);
  return {
    redirect: "/",
    session: { id: created.user.id, passwordHash, theme: created.user.preferences.theme },
  };
}

/** The refusal codes `/account?error=` can carry. */
export type HomeClubError = "club";

/**
 * Change the home club. The user comes from the session (null for a
 * visitor, who is sent to the landing page); the club is checked against
 * `CLUBS` here and again at the write. Nothing is written for a bad club.
 */
export async function submitHomeClubChange(user: User | null, formData: FormData): Promise<SubmitResult> {
  if (!user) return { redirect: "/" };

  const homeClubId = formData.get("homeClub");
  if (!isClubId(homeClubId)) return { redirect: "/account?error=club" };

  switch (await setHomeClub(user.id, homeClubId)) {
    case "saved":
      return { redirect: "/account?saved=1" };
    case "unknown-club":
      return { redirect: "/account?error=club" };
    case "not-found":
      // The user comes from the session, so this is a stale-session edge.
      return { redirect: "/" };
  }
}
