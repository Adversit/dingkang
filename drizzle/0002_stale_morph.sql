ALTER TABLE `campus_messages` ADD `scope` text DEFAULT 'plaza' NOT NULL;--> statement-breakpoint
ALTER TABLE `campus_messages` ADD `campus` text DEFAULT 'south' NOT NULL;--> statement-breakpoint
CREATE INDEX `campus_messages_plaza` ON `campus_messages` (`campus`,`scope`,`id`);