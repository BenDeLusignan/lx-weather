-- Per-day hours replace the two global bitmasks (`days`, `hours`) on `user`: each weekday gets a
-- start and an end block hour (8 to 21, so 17 and 21 is 17:00 to 22:00), both NULL for a day that is
-- off. The window also widens from 10:00-22:00 to 08:00-22:00 (Ben, 30 Oct 2026).
--
-- Additive and in place, like 0001: drizzle-kit would rebuild the whole table, which also resets the
-- AUTOINCREMENT counter (an old session cookie could then name a new person). ALTER TABLE keeps every
-- row and id. The CHECKs are the schema's (src/db/schema.ts), inline because ALTER cannot add a table
-- constraint; the "at least one day" check sits on the last column added so it can see all seven.
--
-- Mapping for an existing account: a day that was on gets the covering range of its old chosen hours
-- (the first to the last chosen block, so 10, 12, 13 becomes 10 to 13); a day that was off stays off.
-- An account that had every hour chosen (the default) was seeing everything, so it gets the whole new
-- window, 8 to 21, not 10 to 21. Everyone else keeps their own first and last hour.
--
-- Order: add the columns (existing rows get the default 8 and 21 on every day, which passes the CHECKs),
-- map, then drop the old columns (each one's own CHECK goes with it).
ALTER TABLE `user` ADD `mon_start` integer DEFAULT 8;--> statement-breakpoint
ALTER TABLE `user` ADD `mon_end` integer DEFAULT 21 CONSTRAINT "user_mon_hours_valid" CHECK((`mon_start` IS NULL AND `mon_end` IS NULL) OR (typeof(`mon_start`) = 'integer' AND typeof(`mon_end`) = 'integer' AND `mon_start` BETWEEN 8 AND 21 AND `mon_end` BETWEEN `mon_start` AND 21));--> statement-breakpoint
ALTER TABLE `user` ADD `tue_start` integer DEFAULT 8;--> statement-breakpoint
ALTER TABLE `user` ADD `tue_end` integer DEFAULT 21 CONSTRAINT "user_tue_hours_valid" CHECK((`tue_start` IS NULL AND `tue_end` IS NULL) OR (typeof(`tue_start`) = 'integer' AND typeof(`tue_end`) = 'integer' AND `tue_start` BETWEEN 8 AND 21 AND `tue_end` BETWEEN `tue_start` AND 21));--> statement-breakpoint
ALTER TABLE `user` ADD `wed_start` integer DEFAULT 8;--> statement-breakpoint
ALTER TABLE `user` ADD `wed_end` integer DEFAULT 21 CONSTRAINT "user_wed_hours_valid" CHECK((`wed_start` IS NULL AND `wed_end` IS NULL) OR (typeof(`wed_start`) = 'integer' AND typeof(`wed_end`) = 'integer' AND `wed_start` BETWEEN 8 AND 21 AND `wed_end` BETWEEN `wed_start` AND 21));--> statement-breakpoint
ALTER TABLE `user` ADD `thu_start` integer DEFAULT 8;--> statement-breakpoint
ALTER TABLE `user` ADD `thu_end` integer DEFAULT 21 CONSTRAINT "user_thu_hours_valid" CHECK((`thu_start` IS NULL AND `thu_end` IS NULL) OR (typeof(`thu_start`) = 'integer' AND typeof(`thu_end`) = 'integer' AND `thu_start` BETWEEN 8 AND 21 AND `thu_end` BETWEEN `thu_start` AND 21));--> statement-breakpoint
ALTER TABLE `user` ADD `fri_start` integer DEFAULT 8;--> statement-breakpoint
ALTER TABLE `user` ADD `fri_end` integer DEFAULT 21 CONSTRAINT "user_fri_hours_valid" CHECK((`fri_start` IS NULL AND `fri_end` IS NULL) OR (typeof(`fri_start`) = 'integer' AND typeof(`fri_end`) = 'integer' AND `fri_start` BETWEEN 8 AND 21 AND `fri_end` BETWEEN `fri_start` AND 21));--> statement-breakpoint
ALTER TABLE `user` ADD `sat_start` integer DEFAULT 8;--> statement-breakpoint
ALTER TABLE `user` ADD `sat_end` integer DEFAULT 21 CONSTRAINT "user_sat_hours_valid" CHECK((`sat_start` IS NULL AND `sat_end` IS NULL) OR (typeof(`sat_start`) = 'integer' AND typeof(`sat_end`) = 'integer' AND `sat_start` BETWEEN 8 AND 21 AND `sat_end` BETWEEN `sat_start` AND 21));--> statement-breakpoint
ALTER TABLE `user` ADD `sun_start` integer DEFAULT 8;--> statement-breakpoint
ALTER TABLE `user` ADD `sun_end` integer DEFAULT 21 CONSTRAINT "user_sun_hours_valid" CHECK((`sun_start` IS NULL AND `sun_end` IS NULL) OR (typeof(`sun_start`) = 'integer' AND typeof(`sun_end`) = 'integer' AND `sun_start` BETWEEN 8 AND 21 AND `sun_end` BETWEEN `sun_start` AND 21)) CONSTRAINT "user_one_day_on" CHECK(`mon_start` IS NOT NULL OR `tue_start` IS NOT NULL OR `wed_start` IS NOT NULL OR `thu_start` IS NOT NULL OR `fri_start` IS NOT NULL OR `sat_start` IS NOT NULL OR `sun_start` IS NOT NULL);--> statement-breakpoint
UPDATE `user` SET
  `mon_start` = CASE WHEN (`user`.`days` & 1) != 0 THEN `mapped`.`lo` END,
  `mon_end` = CASE WHEN (`user`.`days` & 1) != 0 THEN `mapped`.`hi` END,
  `tue_start` = CASE WHEN (`user`.`days` & 2) != 0 THEN `mapped`.`lo` END,
  `tue_end` = CASE WHEN (`user`.`days` & 2) != 0 THEN `mapped`.`hi` END,
  `wed_start` = CASE WHEN (`user`.`days` & 4) != 0 THEN `mapped`.`lo` END,
  `wed_end` = CASE WHEN (`user`.`days` & 4) != 0 THEN `mapped`.`hi` END,
  `thu_start` = CASE WHEN (`user`.`days` & 8) != 0 THEN `mapped`.`lo` END,
  `thu_end` = CASE WHEN (`user`.`days` & 8) != 0 THEN `mapped`.`hi` END,
  `fri_start` = CASE WHEN (`user`.`days` & 16) != 0 THEN `mapped`.`lo` END,
  `fri_end` = CASE WHEN (`user`.`days` & 16) != 0 THEN `mapped`.`hi` END,
  `sat_start` = CASE WHEN (`user`.`days` & 32) != 0 THEN `mapped`.`lo` END,
  `sat_end` = CASE WHEN (`user`.`days` & 32) != 0 THEN `mapped`.`hi` END,
  `sun_start` = CASE WHEN (`user`.`days` & 64) != 0 THEN `mapped`.`lo` END,
  `sun_end` = CASE WHEN (`user`.`days` & 64) != 0 THEN `mapped`.`hi` END
FROM (SELECT `id`, CASE WHEN `hours` = 4095 THEN 8 WHEN (`hours` & 1) != 0 THEN 10 WHEN (`hours` & 2) != 0 THEN 11 WHEN (`hours` & 4) != 0 THEN 12 WHEN (`hours` & 8) != 0 THEN 13 WHEN (`hours` & 16) != 0 THEN 14 WHEN (`hours` & 32) != 0 THEN 15 WHEN (`hours` & 64) != 0 THEN 16 WHEN (`hours` & 128) != 0 THEN 17 WHEN (`hours` & 256) != 0 THEN 18 WHEN (`hours` & 512) != 0 THEN 19 WHEN (`hours` & 1024) != 0 THEN 20 WHEN (`hours` & 2048) != 0 THEN 21 END AS `lo`, CASE WHEN (`hours` & 2048) != 0 THEN 21 WHEN (`hours` & 1024) != 0 THEN 20 WHEN (`hours` & 512) != 0 THEN 19 WHEN (`hours` & 256) != 0 THEN 18 WHEN (`hours` & 128) != 0 THEN 17 WHEN (`hours` & 64) != 0 THEN 16 WHEN (`hours` & 32) != 0 THEN 15 WHEN (`hours` & 16) != 0 THEN 14 WHEN (`hours` & 8) != 0 THEN 13 WHEN (`hours` & 4) != 0 THEN 12 WHEN (`hours` & 2) != 0 THEN 11 WHEN (`hours` & 1) != 0 THEN 10 END AS `hi` FROM `user`) AS `mapped`
WHERE `mapped`.`id` = `user`.`id`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `days`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `hours`;
