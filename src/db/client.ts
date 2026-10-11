import "server-only";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { databaseConnection } from "@/db/connection";
import * as schema from "@/db/schema";

export type Database = LibSQLDatabase<typeof schema>;

/**
 * What `getDb().transaction()` hands its callback. @libsql/client opens it
 * as a write transaction (`BEGIN IMMEDIATE`), so writers queue up and a
 * check made inside one (is this email taken?) still holds when the write
 * that follows it lands.
 */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

let client: Client | undefined;
let db: Database | undefined;

/**
 * The shared Drizzle client. Created on first use, not at import, so only
 * code that actually queries needs DATABASE_URL (`next build` never does).
 */
export function getDb(): Database {
  if (!db) {
    client = createClient(databaseConnection());
    db = drizzle(client, { schema });
  }
  return db;
}

/** Closes the shared client; the next `getDb()` opens a new one. For tests, before deleting the database file. */
export function closeDb(): void {
  client?.close();
  client = undefined;
  db = undefined;
}
