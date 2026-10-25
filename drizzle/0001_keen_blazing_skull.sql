CREATE TABLE `campus_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campus_limits_expiry` ON `campus_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `campus_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_id` text NOT NULL,
	`session_id` text NOT NULL,
	`nickname` text NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `campus_messages_room_id` ON `campus_messages` (`room_id`,`id`);--> statement-breakpoint
CREATE TABLE `campus_players` (
	`session_id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`direction` text DEFAULT 'down' NOT NULL,
	`moving` integer DEFAULT 0 NOT NULL,
	`interior` text,
	`seq` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`teleported_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campus_players_room_seen` ON `campus_players` (`room_id`,`last_seen`);--> statement-breakpoint
CREATE TABLE `campus_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` integer NOT NULL,
	`reporter_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campus_reports_message_reporter` ON `campus_reports` (`message_id`,`reporter_id`);--> statement-breakpoint
CREATE TABLE `campus_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`campus` text NOT NULL,
	`owner_id` text NOT NULL,
	`max_players` integer DEFAULT 8 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campus_rooms_code` ON `campus_rooms` (`code`);--> statement-breakpoint
CREATE INDEX `campus_rooms_campus_created` ON `campus_rooms` (`campus`,`created_at`);--> statement-breakpoint
CREATE TABLE `campus_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`secret_hash` text NOT NULL,
	`owner_id` text,
	`nickname` text NOT NULL,
	`appearance` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `campus_sessions_expiry` ON `campus_sessions` (`expires_at`);