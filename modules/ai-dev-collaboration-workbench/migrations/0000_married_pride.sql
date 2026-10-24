CREATE TABLE `ai_dev_collaboration_workbench__workspaces` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
