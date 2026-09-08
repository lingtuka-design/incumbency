CREATE TABLE `advance_types` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'Government Department',
	`sort_order` integer DEFAULT 0,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `incumbencies` (
	`id` text PRIMARY KEY NOT NULL,
	`department_code` text NOT NULL,
	`advance_type` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`designation` text,
	`father_name` text,
	`remarks` text,
	`status` text DEFAULT 'ACTIVE',
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`department_code`) REFERENCES `departments`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`advance_type`) REFERENCES `advance_types`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_incumbencies_dept` ON `incumbencies` (`department_code`);--> statement-breakpoint
CREATE INDEX `idx_incumbencies_type` ON `incumbencies` (`advance_type`);--> statement-breakpoint
CREATE INDEX `idx_incumbencies_code` ON `incumbencies` (`code`);--> statement-breakpoint
CREATE INDEX `idx_incumbencies_name` ON `incumbencies` (`name`);--> statement-breakpoint
CREATE INDEX `idx_incumbencies_status` ON `incumbencies` (`status`);