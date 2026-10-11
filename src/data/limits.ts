/**
 * Length caps on form fields, and the failed-attempt limiter's thresholds.
 * Server Actions are public POST endpoints, so the server refuses anything
 * longer than these; forms set the same `maxLength` so the browser stops it
 * first. Pure (no `server-only`) so any component can use them.
 */

/** A password's floor, as on LX Tennis. */
export const PASSWORD_MIN_LENGTH = 12;

/** Bounds what anyone can make scrypt chew on. */
export const PASSWORD_MAX_LENGTH = 1024;

/** An email address; 254 is the practical RFC 5321 limit. */
export const EMAIL_MAX_LENGTH = 254;

// The failed-attempt limiter (rules in `src/data/attempt-rules.ts`, storage in
// `src/data/attempts.ts`). Serverless functions share no memory, so failures
// are counted in the database.

/**
 * Attempts against one (typed email, client address) pair before a lockout:
 * 5 wrong passwords from one address for one account. Keyed per address as
 * well as per account so a stranger can't lock someone else out of their own
 * account from their own address.
 */
export const LOGIN_FAILURE_LIMIT = 5;

/**
 * Attempts from one client address across every email typed before a
 * lockout: higher, so it stops one address spraying many accounts without
 * tripping on a household or an office that shares an address.
 */
export const IP_FAILURE_LIMIT = 20;

/**
 * How long failures keep counting towards the limit. A streak that goes
 * quiet for this long starts again from zero. Longer than the longest
 * lockout step, so the step a repeat offender reaches survives their own
 * lockout.
 */
export const FAILURE_WINDOW_MINUTES = 30;

/**
 * Lockout lengths, in order, for each lockout a key reaches within one
 * window: a minute, then five, then fifteen for every one after. Short on
 * purpose: the point is to make guessing slow, not to punish.
 */
export const LOCKOUT_STEPS_MINUTES = [1, 5, 15] as const;
