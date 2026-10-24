CREATE TABLE `zhizheng_research__ai_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`latency` integer NOT NULL,
	`usage` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `zhizheng_research__files` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`hash` text NOT NULL,
	`kind` text NOT NULL,
	`size` integer NOT NULL,
	`pages` integer,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `zhizheng_research__files_owner_project` ON `zhizheng_research__files` (`owner_id`,`project_id`);--> statement-breakpoint
CREATE TABLE `zhizheng_research__projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`state` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `zhizheng_research__projects_owner` ON `zhizheng_research__projects` (`owner_id`);--> statement-breakpoint
CREATE TABLE `zhizheng_research__versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`revision` integer NOT NULL,
	`state` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zhizheng_research__version_project_revision` ON `zhizheng_research__versions` (`project_id`,`revision`);
