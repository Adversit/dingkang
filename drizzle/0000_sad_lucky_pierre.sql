CREATE TABLE `hub_files` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`module_id` text NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hub_files_owner_module_created` ON `hub_files` (`owner_id`,`module_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `hub_files_object_key_unique` ON `hub_files` (`object_key`);--> statement-breakpoint
CREATE TABLE `hub_state_versions` (
	`owner_id` text NOT NULL,
	`module_id` text NOT NULL,
	`revision` integer NOT NULL,
	`values_json` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `module_id`, `revision`)
);
--> statement-breakpoint
CREATE TABLE `hub_states` (
	`owner_id` text NOT NULL,
	`module_id` text NOT NULL,
	`values_json` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `module_id`)
);
--> statement-breakpoint
CREATE TABLE `ai_dev_collaboration_workbench__admin_reads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`target` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_dev_collaboration_workbench__admin_reads_created_at` ON `ai_dev_collaboration_workbench__admin_reads` (`created_at`);--> statement-breakpoint
CREATE TABLE `ai_dev_collaboration_workbench__workspaces` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_dev_collaboration_workbench__delivery_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`operation` text NOT NULL,
	`project_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_dev_collaboration_workbench__delivery_call_operation` ON `ai_dev_collaboration_workbench__delivery_calls` (`owner`,`operation`);--> statement-breakpoint
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
--> statement-breakpoint
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
CREATE TABLE `evopm_workbench__analysis_leases` (
	`owner_id` text NOT NULL,
	`request_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `request_id`)
);
--> statement-breakpoint
CREATE TABLE `evopm_workbench__workspaces` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roommate_housekeeper__demo_households` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wandeng_evening__conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`mode` text NOT NULL,
	`mood` text,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wandeng_evening__conversations_owner` ON `wandeng_evening__conversations` (`owner`,`updated`);--> statement-breakpoint
CREATE TABLE `wandeng_evening__memories` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`type` text NOT NULL,
	`topic` text NOT NULL,
	`content` text NOT NULL,
	`sources` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`expires` text
);
--> statement-breakpoint
CREATE INDEX `wandeng_evening__memories_owner` ON `wandeng_evening__memories` (`owner`,`updated`);--> statement-breakpoint
CREATE TABLE `wandeng_evening__messages` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`conversation` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`context_blocked` integer DEFAULT 0 NOT NULL,
	`memory_refs` text DEFAULT '[]' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wandeng_evening__messages_owner_conversation` ON `wandeng_evening__messages` (`owner`,`conversation`);--> statement-breakpoint
CREATE TABLE `wandeng_evening__pages` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`date` text NOT NULL,
	`mood` text,
	`sources` text DEFAULT '[]' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wandeng_evening__pages_owner` ON `wandeng_evening__pages` (`owner`,`updated`);--> statement-breakpoint
CREATE TABLE `wandeng_evening__preferences` (
	`owner` text PRIMARY KEY NOT NULL,
	`history` integer DEFAULT 1 NOT NULL,
	`memory` integer DEFAULT 1 NOT NULL,
	`consent` integer DEFAULT 0 NOT NULL,
	`epoch` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`tone` text DEFAULT 'warm' NOT NULL,
	`reply_length` text DEFAULT 'normal' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wandeng_evening__runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`conversation` text,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`duration` integer,
	`input_tokens` integer,
	`output_tokens` integer,
	`created` text NOT NULL,
	`expires` text
);
--> statement-breakpoint
CREATE INDEX `wandeng_evening__runs_owner` ON `wandeng_evening__runs` (`owner`,`created`);--> statement-breakpoint
CREATE TABLE `wandeng_evening__suppressions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`hash` text NOT NULL,
	`memory_id` text,
	`sources` text DEFAULT '[]' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wandeng_evening__suppressions_owner` ON `wandeng_evening__suppressions` (`owner`);--> statement-breakpoint
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
	`job_override` text,
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
CREATE UNIQUE INDEX `zhiliu_radar__source_url_unique` ON `zhiliu_radar__sources` (`url`);--> statement-breakpoint
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