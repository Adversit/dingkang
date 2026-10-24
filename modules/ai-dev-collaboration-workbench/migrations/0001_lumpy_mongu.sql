CREATE TABLE `ai_dev_collaboration_workbench__admin_reads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`target` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_dev_collaboration_workbench__admin_reads_created_at` ON `ai_dev_collaboration_workbench__admin_reads` (`created_at`);