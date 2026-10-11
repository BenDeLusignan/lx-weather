import "server-only";
import { secretHmac } from "@/auth/secret";
import type { AttemptCounter } from "@/data/attempts";
import { IP_FAILURE_LIMIT, LOGIN_FAILURE_LIMIT } from "@/data/limits";

/**
 * The limiter's keys, and the limits that go with them.
 *
 * Each key is an HMAC of what it stands for, keyed by SESSION_SECRET, so the
 * `login_attempt` table holds no email address and no IP address: a database
 * leak exposes neither. The prefix keeps a login key, a sign-up key and an IP
 * key apart, so one can't be read as another. If SESSION_SECRET changes every
 * key changes with it: the old rows are never matched again (and are swept
 * once they expire), so all counters and lockouts start afresh. That's
 * acceptable: changing it already logs everyone out.
 *
 * An (email, address) pair is what stops a stranger who doesn't know someone's
 * email from locking them out: their failures land on (that email, their
 * address), and the owner's own address is a different key. The address
 * counter is shared by every email typed and by log in and sign up alike, so
 * one address spraying many accounts hits it, at `IP_FAILURE_LIMIT`.
 */

/**
 * What an absent address (local development, no trusted header) becomes.
 * Every such request shares one bucket: coarser than real per-address keying,
 * but on Vercel the header is always there, and a request without one can
 * only ever lock out other requests without one.
 */
const NO_IP = "unknown";

export interface AttemptKeys {
  /** (typed email, address): wrong passwords for one account from one address. */
  pair: AttemptCounter;
  /** Address alone: attempts across every email typed, from one address. */
  ip: AttemptCounter;
}

function keys(pairValue: string, ip: string | null): AttemptKeys {
  const address = ip ?? NO_IP;
  return {
    pair: { key: secretHmac("attempt", `${pairValue}|${address}`), limit: LOGIN_FAILURE_LIMIT },
    ip: { key: secretHmac("attempt", `ip:${address}`), limit: IP_FAILURE_LIMIT },
  };
}

/**
 * Keys for a login attempt: whatever was typed in the email field, trimmed
 * and lowercased (so a typo'd or made-up email is counted like any other),
 * and the client address.
 */
export function loginAttemptKeys(email: string, ip: string | null): AttemptKeys {
  return keys(`login:${email.trim().toLowerCase()}`, ip);
}

/**
 * Keys for a sign-up attempt. An email that's already taken counts as a
 * failure (`submitSignUp`), so someone probing which emails have accounts
 * runs into the same lockouts as someone guessing passwords.
 */
export function signUpAttemptKeys(email: string, ip: string | null): AttemptKeys {
  return keys(`signup:${email.trim().toLowerCase()}`, ip);
}

/**
 * Keys for a change-password attempt: the logged-in user's id and the client
 * address. The wrong "current password" is the guess being limited, so a stolen
 * session can't be used to try passwords against the account. The id is a
 * number from the verified session, not typed input, so there is no email to
 * normalise. The address counter is the same one login and sign-up use, so
 * one address can't get a fresh budget by switching between the three.
 */
export function passwordChangeAttemptKeys(userId: number, ip: string | null): AttemptKeys {
  return keys(`password:${userId}`, ip);
}
