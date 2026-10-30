CREATE TABLE `novel_model_secret_preferences` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL
);
