CREATE TABLE `novel_archive_chunks` (
	`owner_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`owner_id`, `chunk_index`)
);
--> statement-breakpoint
CREATE TABLE `novel_archive_heads` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`write_token` text NOT NULL,
	`chunk_count` integer NOT NULL,
	`state_hash` text NOT NULL,
	`updated_at` text NOT NULL,
	`legacy_version` integer NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER `novel_legacy_read_only_after_upgrade_update`
BEFORE UPDATE ON `novel_canon_states`
WHEN EXISTS (SELECT 1 FROM `novel_archive_heads` WHERE `owner_id` = OLD.`owner_id`)
BEGIN SELECT RAISE(ABORT, 'novel archive migrated; legacy is read-only'); END;
--> statement-breakpoint
CREATE TRIGGER `novel_legacy_read_only_after_upgrade_insert`
BEFORE INSERT ON `novel_canon_states`
WHEN EXISTS (SELECT 1 FROM `novel_archive_heads` WHERE `owner_id` = NEW.`owner_id`)
BEGIN SELECT RAISE(ABORT, 'novel archive migrated; legacy is read-only'); END;
