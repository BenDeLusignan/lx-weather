CREATE TABLE `login_attempt` (
	`attempt_key` text PRIMARY KEY NOT NULL,
	`failures` integer NOT NULL,
	`window_expires_at` integer NOT NULL,
	`locked_until` integer NOT NULL,
	`lockout_level` integer NOT NULL,
	CONSTRAINT "login_attempt_key_not_blank" CHECK(length("login_attempt"."attempt_key") > 0),
	CONSTRAINT "login_attempt_counters_valid" CHECK("login_attempt"."failures" >= 0 AND "login_attempt"."window_expires_at" >= 0 AND "login_attempt"."locked_until" >= 0 AND "login_attempt"."lockout_level" >= 0)
);
--> statement-breakpoint
CREATE INDEX `login_attempt_expiry_idx` ON `login_attempt` (`window_expires_at`,`locked_until`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`home_club_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "user_email_normalised" CHECK("user"."email" = lower(trim("user"."email"))),
	CONSTRAINT "user_email_length" CHECK(length("user"."email") BETWEEN 3 AND 254),
	CONSTRAINT "user_home_club_not_blank" CHECK(length("user"."home_club_id") > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);