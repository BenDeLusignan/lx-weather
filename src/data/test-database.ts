/**
 * For tests only. Import it FIRST in a test file, before anything from
 * `src/data` or `src/auth`: it sets DATABASE_URL and SESSION_SECRET before
 * those modules need them.
 *
 * The database is a new file in the temp directory with every migration in
 * `drizzle/` applied, used through the app's own `getDb()`, never local.db.
 * One per test file (each file runs in its own process), shared by its
 * tests, so tests use their own emails to stay out of each other's way.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before } from "node:test";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { closeDb, getDb } from "@/db/client";
import { user } from "@/db/schema";

const dir = mkdtempSync(path.join(tmpdir(), "lx-weather-test-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
process.env.SESSION_SECRET = "test-secret-that-is-at-least-32-characters-long";

// Close the client first: the file stays open until it is.
after(() => {
  closeDb();
  rmSync(dir, { recursive: true, force: true });
});

before(async () => {
  await migrate(getDb(), { migrationsFolder: path.join(process.cwd(), "drizzle") });
});

/** Every stored row for an email, as stored. */
export async function usersWithEmail(email: string) {
  return getDb().select().from(user).where(eq(user.email, email));
}
