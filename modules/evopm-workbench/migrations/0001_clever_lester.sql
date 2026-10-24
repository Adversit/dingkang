CREATE TABLE `evopm_workbench__analysis_leases` (
	`owner_id` text NOT NULL,
	`request_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `request_id`)
);
