CREATE TABLE `ai_dev_collaboration_workbench__delivery_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`project_id` text NOT NULL,
	`operation` text NOT NULL,
	`action` text NOT NULL,
	`revision` integer NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_dev_collaboration_workbench__delivery_event_operation` ON `ai_dev_collaboration_workbench__delivery_events` (`owner`,`operation`);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_dev_collaboration_workbench__delivery_event_revision` ON `ai_dev_collaboration_workbench__delivery_events` (`project_id`,`revision`);--> statement-breakpoint
CREATE TABLE `ai_dev_collaboration_workbench__delivery_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`state` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`operation` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
