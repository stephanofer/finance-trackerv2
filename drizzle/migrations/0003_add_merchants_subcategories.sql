-- Add Merchants table for establishments/stores
CREATE TABLE `merchants` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`category_id` text,
	`icon` text,
	`logo` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `merchants_user_idx` ON `merchants` (`user_id`);
--> statement-breakpoint
CREATE INDEX `merchants_user_name_idx` ON `merchants` (`user_id`,`name`);
--> statement-breakpoint

-- Add subcategory_id, merchant_id, and merchant_name to transactions
ALTER TABLE `transactions` ADD `subcategory_id` text REFERENCES `categories`(`id`);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `merchant_id` text REFERENCES `merchants`(`id`);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `merchant_name` text;
--> statement-breakpoint
CREATE INDEX `transactions_subcategory_idx` ON `transactions` (`subcategory_id`);
--> statement-breakpoint
CREATE INDEX `transactions_merchant_idx` ON `transactions` (`merchant_id`);
