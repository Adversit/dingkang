CREATE TABLE `novel_canon_states` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`version` integer NOT NULL,
	`updated_at` text NOT NULL
);
