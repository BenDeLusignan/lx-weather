/**
 * Database schema (Drizzle). Only `src/data` and the tooling
 * (`drizzle.config.ts`) import `src/db`; pages and components go through
 * `src/data`.
 *
 * After changing a table here, run `npm run db:generate` to write the SQL
 * migration into `drizzle/`, and commit both together.
 */
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * A person with an account. AUTOINCREMENT so an id is never reused after a
 * row is deleted: an old session cookie can't end up naming someone else.
 */
export const user = sqliteTable(
  "user",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** What they log in with. Stored trimmed and lowercased (see the checks below). */
    email: text("email").notNull().unique(),
    /** `scrypt$N$r$p$salt$hash` from `src/auth/password.ts`. */
    passwordHash: text("password_hash").notNull(),
    /**
     * A club `id` from `src/clubs/clubs.ts`. Not a foreign key: the club list
     * is code, not a table, so the code checks it at every write
     * (`src/data/users.ts`) and every read copes with an id that has since
     * left the list (the user is sent to /account to choose again).
     */
    homeClubId: text("home_club_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    // The app stores `trim(lower(email))`; these pin it against a raw insert,
    // so "Ben@x.com" can't sit beside "ben@x.com" as a second account.
    check("user_email_normalised", sql`${table.email} = lower(trim(${table.email}))`),
    // Same cap as EMAIL_MAX_LENGTH in src/data/limits.ts.
    check("user_email_length", sql`length(${table.email}) BETWEEN 3 AND 254`),
    check("user_home_club_not_blank", sql`length(${table.homeClubId}) > 0`),
  ],
);

/**
 * Failed password attempts, so the limiter survives serverless functions
 * sharing no memory. One row per key: a (typed email, client address) pair,
 * or one client address across every email typed. The key is an HMAC of
 * those (`src/auth/attempt-keys.ts`), so the table holds no email address
 * and no IP address, only an opaque digest.
 *
 * The rules live in `src/data/attempt-rules.ts` and are pure; this table
 * only stores their result. Times are Unix seconds, so a test can move the
 * clock without sleeping. Rows whose window and lock have both passed are
 * deleted by the next write (`src/data/attempts.ts`), so there is no cron.
 */
export const loginAttempt = sqliteTable(
  "login_attempt",
  {
    /** base64url HMAC-SHA256 of the key string. */
    attemptKey: text("attempt_key").primaryKey(),
    /** Failures recorded in the current window. */
    failures: integer("failures").notNull(),
    /** Unix seconds; after this a failure streak starts again from zero. */
    windowExpiresAt: integer("window_expires_at").notNull(),
    /** Unix seconds; requests before this are refused unverified. 0 when not locked. */
    lockedUntil: integer("locked_until").notNull(),
    /** Lockouts this key has reached in the window; picks the escalating step. */
    lockoutLevel: integer("lockout_level").notNull(),
  },
  (table) => [
    check("login_attempt_key_not_blank", sql`length(${table.attemptKey}) > 0`),
    check(
      "login_attempt_counters_valid",
      sql`${table.failures} >= 0 AND ${table.windowExpiresAt} >= 0 AND ${table.lockedUntil} >= 0 AND ${table.lockoutLevel} >= 0`,
    ),
    // Housekeeping (a delete on every write) looks rows up by these.
    index("login_attempt_expiry_idx").on(table.windowExpiresAt, table.lockedUntil),
  ],
);
