ALTER TABLE `incumbencies` ADD `superannuation` text;--> statement-breakpoint
ALTER TABLE `incumbencies` ADD `rg_number` text;--> statement-breakpoint
CREATE INDEX `idx_incumbencies_rg_number` ON `incumbencies` (`rg_number`);