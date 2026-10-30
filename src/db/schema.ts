/**
 * Database schema (Drizzle). Only `src/data` and the tooling
 * (`drizzle.config.ts`) import `src/db`; pages and components go through
 * `src/data`.
 *
 * After changing a table here, run `npm run db:generate` to write the SQL
 * migration into `drizzle/`, and commit both together.
 */
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

/**
 * A weekday's chosen hours: both NULL (the day is switched off) or a start
 * and end block hour from 8 to 21 with start <= end, whole numbers (an
 * INTEGER column would otherwise keep 8.5). The NULL tests are explicit
 * because a CHECK that evaluates to NULL passes: `NULL BETWEEN 8 AND 21`
 * alone would let a start with no end in. Plain numbers, pinned to
 * `FIRST_BLOCK_HOUR` and `LAST_BLOCK_HOUR` by a test in
 * `src/preferences/preferences.test.ts`; this file is loaded by drizzle-kit
 * without the `@/` alias, so it can't import them.
 */
function dayHoursValid(name: string, start: AnySQLiteColumn, end: AnySQLiteColumn) {
  return check(
    name,
    sql`(${start} IS NULL AND ${end} IS NULL) OR (typeof(${start}) = 'integer' AND typeof(${end}) = 'integer' AND ${start} BETWEEN 8 AND 21 AND ${end} BETWEEN ${start} AND 21)`,
  );
}

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
    /**
     * The user's own settings (`src/preferences/preferences.ts` explains the
     * layout). `theme` is 'system' | 'light' | 'dark'. Each weekday has a
     * start and an end: the start hours of the first and last block shown
     * (8 to 21, so 17 and 21 is 17:00 to 22:00); both NULL is a day that is
     * switched off. The defaults are the whole window, every day, so an
     * account that never touches them sees everything.
     */
    theme: text("theme").notNull().default("system"),
    monStart: integer("mon_start").default(8),
    monEnd: integer("mon_end").default(21),
    tueStart: integer("tue_start").default(8),
    tueEnd: integer("tue_end").default(21),
    wedStart: integer("wed_start").default(8),
    wedEnd: integer("wed_end").default(21),
    thuStart: integer("thu_start").default(8),
    thuEnd: integer("thu_end").default(21),
    friStart: integer("fri_start").default(8),
    friEnd: integer("fri_end").default(21),
    satStart: integer("sat_start").default(8),
    satEnd: integer("sat_end").default(21),
    sunStart: integer("sun_start").default(8),
    sunEnd: integer("sun_end").default(21),
  },
  (table) => [
    // The app stores `trim(lower(email))`; these pin it against a raw insert,
    // so "Ben@x.com" can't sit beside "ben@x.com" as a second account.
    check("user_email_normalised", sql`${table.email} = lower(trim(${table.email}))`),
    // Same cap as EMAIL_MAX_LENGTH in src/data/limits.ts.
    check("user_email_length", sql`length(${table.email}) BETWEEN 3 AND 254`),
    check("user_home_club_not_blank", sql`length(${table.homeClubId}) > 0`),
    check("user_theme_valid", sql`${table.theme} IN ('system', 'light', 'dark')`),
    dayHoursValid("user_mon_hours_valid", table.monStart, table.monEnd),
    dayHoursValid("user_tue_hours_valid", table.tueStart, table.tueEnd),
    dayHoursValid("user_wed_hours_valid", table.wedStart, table.wedEnd),
    dayHoursValid("user_thu_hours_valid", table.thuStart, table.thuEnd),
    dayHoursValid("user_fri_hours_valid", table.friStart, table.friEnd),
    dayHoursValid("user_sat_hours_valid", table.satStart, table.satEnd),
    dayHoursValid("user_sun_hours_valid", table.sunStart, table.sunEnd),
    // At least one day on, so the week is never blank (vision, Core flow 8).
    check(
      "user_one_day_on",
      sql`${table.monStart} IS NOT NULL OR ${table.tueStart} IS NOT NULL OR ${table.wedStart} IS NOT NULL OR ${table.thuStart} IS NOT NULL OR ${table.friStart} IS NOT NULL OR ${table.satStart} IS NOT NULL OR ${table.sunStart} IS NOT NULL`,
    ),
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
