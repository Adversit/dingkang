CREATE TABLE `novel_model_preferences` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`model_id` text,
	`source_revision` integer NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL
);
