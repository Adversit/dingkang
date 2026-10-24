CREATE TABLE `zhiliu_radar__digests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`date` text NOT NULL,
	`content` text NOT NULL,
	`event_ids` text NOT NULL,
	`edited` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `zhiliu_radar__digests_owner_date_idx` ON `zhiliu_radar__digests` (`owner`,`date`);--> statement-breakpoint
CREATE TABLE `zhiliu_radar__events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`manual_title` text,
	`manual_summary` text,
	`locked` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `zhiliu_radar__reading_feedback` (
	`owner` text NOT NULL,
	`event_id` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner`, `event_id`, `kind`),
	FOREIGN KEY (`event_id`) REFERENCES `zhiliu_radar__events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `zhiliu_radar__idempotency` (
	`key` text PRIMARY KEY NOT NULL,
	`response` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `zhiliu_radar__item_sources` (
	`item_id` text NOT NULL,
	`source_id` text NOT NULL,
	`raw_url` text NOT NULL,
	`fetched_at` text NOT NULL,
	PRIMARY KEY(`item_id`, `source_id`),
	FOREIGN KEY (`item_id`) REFERENCES `zhiliu_radar__items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `zhiliu_radar__sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `zhiliu_radar__items` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`raw_url` text NOT NULL,
	`canonical_url` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`content_hash` text NOT NULL,
	`published_at` text,
	`raw_published` text,
	`ingested_at` text NOT NULL,
	`scope` text NOT NULL,
	`category` text NOT NULL,
	`job` text,
	FOREIGN KEY (`source_id`) REFERENCES `zhiliu_radar__sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zhiliu_radar__item_url_unique` ON `zhiliu_radar__items` (`canonical_url`);--> statement-breakpoint
CREATE UNIQUE INDEX `zhiliu_radar__item_hash_unique` ON `zhiliu_radar__items` (`content_hash`);--> statement-breakpoint
CREATE INDEX `zhiliu_radar__item_published_idx` ON `zhiliu_radar__items` (`published_at`);--> statement-breakpoint
CREATE TABLE `zhiliu_radar__item_event_links` (
	`item_id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`manual` integer DEFAULT 0 NOT NULL,
	`relation` text DEFAULT '独立报道' NOT NULL,
	`assigned_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `zhiliu_radar__items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `zhiliu_radar__events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `zhiliu_radar__links_event_idx` ON `zhiliu_radar__item_event_links` (`event_id`);--> statement-breakpoint
CREATE TABLE `zhiliu_radar__operation_locks` (
	`key` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `zhiliu_radar__model_outputs` (
	`item_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`model` text NOT NULL,
	`provider` text NOT NULL,
	`summary` text,
	`title` text,
	`reason` text,
	`duration` integer,
	`input_tokens` integer,
	`output_tokens` integer,
	`error` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `zhiliu_radar__items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `zhiliu_radar__user_preferences` (
	`owner` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `zhiliu_radar__ingestion_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`trigger` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`total` integer DEFAULT 0 NOT NULL,
	`succeeded` integer DEFAULT 0 NOT NULL,
	`failed` integer DEFAULT 0 NOT NULL,
	`inserted` integer DEFAULT 0 NOT NULL,
	`duplicates` integer DEFAULT 0 NOT NULL,
	`results` text DEFAULT '[]' NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `zhiliu_radar__site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `zhiliu_radar__sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`category` text NOT NULL,
	`quality` integer DEFAULT 25 NOT NULL,
	`official` integer DEFAULT 1 NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`etag` text,
	`modified` text,
	`last_attempt` text,
	`last_success` text,
	`last_error` text,
	`failures` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zhiliu_radar__source_url_unique` ON `zhiliu_radar__sources` (`url`);

ALTER TABLE `zhiliu_radar__items` ADD `job_override` text;
