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
	`updated` text NOT NULL
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
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `wandeng_evening__suppressions_owner` ON `wandeng_evening__suppressions` (`owner`);

ALTER TABLE `wandeng_evening__messages` ADD `memory_refs` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `wandeng_evening__preferences` ADD `nickname` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `wandeng_evening__preferences` ADD `tone` text DEFAULT 'warm' NOT NULL;--> statement-breakpoint
ALTER TABLE `wandeng_evening__preferences` ADD `reply_length` text DEFAULT 'normal' NOT NULL;

ALTER TABLE `wandeng_evening__suppressions` ADD `memory_id` text;--> statement-breakpoint
ALTER TABLE `wandeng_evening__suppressions` ADD `sources` text DEFAULT '[]' NOT NULL;
