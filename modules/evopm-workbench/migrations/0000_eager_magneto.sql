CREATE TABLE `evopm_workbench__action_receipts` (
	`owner_id` text NOT NULL,
	`request_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`revision` integer NOT NULL,
	`result_json` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `request_id`)
);
--> statement-breakpoint
CREATE TABLE `evopm_workbench__workspaces` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
