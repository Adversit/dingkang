CREATE TABLE `ai_dev_collaboration_workbench__delivery_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`operation` text NOT NULL,
	`project_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_dev_collaboration_workbench__delivery_call_operation` ON `ai_dev_collaboration_workbench__delivery_calls` (`owner`,`operation`);