-- Additive: three columns on `user`, each with a default, so every existing row
-- reads as "follow the device, every day, every hour" (the site as it was).
-- drizzle-kit would rebuild the whole table to add the CHECKs, which also
-- resets the AUTOINCREMENT counter (an old session cookie could then name a
-- new person); ALTER TABLE ADD COLUMN takes the same CHECKs inline and
-- touches nothing else. The constraint names and expressions match the schema
-- (src/db/schema.ts) so the next `db:generate` finds no difference.
ALTER TABLE `user` ADD `theme` text DEFAULT 'system' NOT NULL CONSTRAINT "user_theme_valid" CHECK(`theme` IN ('system', 'light', 'dark'));--> statement-breakpoint
ALTER TABLE `user` ADD `days` integer DEFAULT 127 NOT NULL CONSTRAINT "user_days_valid" CHECK(`days` BETWEEN 1 AND 127);--> statement-breakpoint
ALTER TABLE `user` ADD `hours` integer DEFAULT 4095 NOT NULL CONSTRAINT "user_hours_valid" CHECK(`hours` BETWEEN 1 AND 4095);
