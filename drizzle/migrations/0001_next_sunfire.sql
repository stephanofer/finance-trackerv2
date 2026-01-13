CREATE TABLE `scheduled_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'PEN' NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_date` text,
	`paid_amount` real,
	`category_id` text,
	`account_id` text,
	`debt_id` text,
	`loan_id` text,
	`debt_installment_id` text,
	`is_recurring` integer DEFAULT false NOT NULL,
	`recurring_frequency` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`tags` text,
	`notes` text,
	`reminder_days` integer DEFAULT 3,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`loan_id`) REFERENCES `loans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`debt_installment_id`) REFERENCES `debt_installments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `scheduled_payments_user_idx` ON `scheduled_payments` (`user_id`);--> statement-breakpoint
CREATE INDEX `scheduled_payments_user_status_idx` ON `scheduled_payments` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `scheduled_payments_user_due_idx` ON `scheduled_payments` (`user_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`language` text DEFAULT 'es' NOT NULL,
	`date_format` text DEFAULT 'DD/MM/YYYY' NOT NULL,
	`number_format` text DEFAULT 'es-PE' NOT NULL,
	`dashboard_config` text DEFAULT '{}' NOT NULL,
	`notify_on_due_payments` integer DEFAULT true NOT NULL,
	`notify_on_goal_progress` integer DEFAULT true NOT NULL,
	`notify_on_recurring` integer DEFAULT true NOT NULL,
	`show_cents_in_amounts` integer DEFAULT true NOT NULL,
	`default_account_id` text,
	`start_of_week` integer DEFAULT 1 NOT NULL,
	`fiscal_month_start` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_unique` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_settings_user_idx` ON `user_settings` (`user_id`);