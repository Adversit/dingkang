CREATE TABLE `hub_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`module_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`expected` text DEFAULT '' NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`page_path` text NOT NULL,
	`reporter_id` text,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'pending_review' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hub_feedback_request_id_unique` ON `hub_feedback` (`request_id`);--> statement-breakpoint
CREATE INDEX `hub_feedback_status_created` ON `hub_feedback` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `hub_feedback_created` ON `hub_feedback` (`created_at`);--> statement-breakpoint
CREATE TABLE `hub_feedback_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hub_feedback_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`feedback_id` text NOT NULL,
	`decision` text NOT NULL,
	`note` text NOT NULL,
	`actor_id` text NOT NULL,
	`version` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hub_feedback_reviews_feedback` ON `hub_feedback_reviews` (`feedback_id`,`version`);