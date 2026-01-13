import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// ============================================
// USERS TABLE
// ============================================
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID v4
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("PEN"), // Default currency
  avatarUrl: text("avatar_url"), // R2 URL for user avatar
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  categories: many(categories),
  transactions: many(transactions),
  debts: many(debts),
  loans: many(loans),
  goals: many(goals),
  recurringTransactions: many(recurringTransactions),
  settings: one(userSettings),
  scheduledPayments: many(scheduledPayments),
}));

// ============================================
// ACCOUNT TYPES TABLE
// ============================================
export const accountTypes = sqliteTable("account_types", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Cash, Debit, Credit, Bank, Savings, Investment, Wallet
  icon: text("icon"), // Optional icon identifier
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("account_types_user_idx").on(table.userId),
]);

export const accountTypesRelations = relations(accountTypes, ({ one, many }) => ({
  user: one(users, {
    fields: [accountTypes.userId],
    references: [users.id],
  }),
  accounts: many(accounts),
}));

// ============================================
// ACCOUNTS TABLE (Ledger)
// ============================================
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountTypeId: text("account_type_id").notNull().references(() => accountTypes.id),
  name: text("name").notNull(),
  description: text("description"),
  currency: text("currency").notNull().default("PEN"),
  initialBalance: real("initial_balance").notNull().default(0),
  color: text("color"), // For UI customization
  icon: text("icon"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  includeInTotal: integer("include_in_total", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("accounts_user_idx").on(table.userId),
  index("accounts_user_created_idx").on(table.userId, table.createdAt),
]);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  accountType: one(accountTypes, {
    fields: [accounts.accountTypeId],
    references: [accountTypes.id],
  }),
  transactions: many(transactions),
  transfersFrom: many(transfers, { relationName: "fromAccount" }),
  transfersTo: many(transfers, { relationName: "toAccount" }),
}));

// ============================================
// CATEGORIES TABLE
// ============================================
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: text("parent_id"), // Self-reference for subcategories
  name: text("name").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(), // Category type
  icon: text("icon"),
  color: text("color"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("categories_user_idx").on(table.userId),
  index("categories_user_type_idx").on(table.userId, table.type),
  index("categories_parent_idx").on(table.parentId),
]);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "subcategories",
  }),
  subcategories: many(categories, { relationName: "subcategories" }),
  transactions: many(transactions),
}));

// ============================================
// TRANSACTIONS TABLE (The Engine)
// ============================================
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => accounts.id),
  categoryId: text("category_id").references(() => categories.id),
  type: text("type", { 
    enum: ["income", "expense", "debt_payment", "goal_contribution", "loan_payment"] 
  }).notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  notes: text("notes"),
  date: text("date").notNull(), // ISO date string YYYY-MM-DD
  attachmentUrl: text("attachment_url"), // R2 Storage URL
  // Reference fields for linked entities
  debtId: text("debt_id").references(() => debts.id),
  loanId: text("loan_id").references(() => loans.id),
  goalId: text("goal_id").references(() => goals.id),
  recurringTransactionId: text("recurring_transaction_id").references(() => recurringTransactions.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("transactions_user_idx").on(table.userId),
  index("transactions_user_date_idx").on(table.userId, table.date),
  index("transactions_account_idx").on(table.accountId),
  index("transactions_category_idx").on(table.categoryId),
  index("transactions_user_type_idx").on(table.userId, table.type),
]);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  debt: one(debts, {
    fields: [transactions.debtId],
    references: [debts.id],
  }),
  loan: one(loans, {
    fields: [transactions.loanId],
    references: [loans.id],
  }),
  goal: one(goals, {
    fields: [transactions.goalId],
    references: [goals.id],
  }),
  recurringTransaction: one(recurringTransactions, {
    fields: [transactions.recurringTransactionId],
    references: [recurringTransactions.id],
  }),
}));

// ============================================
// TRANSFERS TABLE (Account to Account)
// ============================================
export const transfers = sqliteTable("transfers", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fromAccountId: text("from_account_id").notNull().references(() => accounts.id),
  toAccountId: text("to_account_id").notNull().references(() => accounts.id),
  amount: real("amount").notNull(),
  fee: real("fee").default(0), // Transfer fee if any
  description: text("description"),
  date: text("date").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("transfers_user_idx").on(table.userId),
  index("transfers_user_date_idx").on(table.userId, table.date),
]);

export const transfersRelations = relations(transfers, ({ one }) => ({
  user: one(users, {
    fields: [transfers.userId],
    references: [users.id],
  }),
  fromAccount: one(accounts, {
    fields: [transfers.fromAccountId],
    references: [accounts.id],
    relationName: "fromAccount",
  }),
  toAccount: one(accounts, {
    fields: [transfers.toAccountId],
    references: [accounts.id],
    relationName: "toAccount",
  }),
}));

// ============================================
// DEBTS TABLE (Money user owes)
// ============================================
export const debts = sqliteTable("debts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creditor: text("creditor").notNull(), // Who user owes money to
  description: text("description"),
  principalAmount: real("principal_amount").notNull(),
  interestRate: real("interest_rate").default(0), // Annual percentage
  currency: text("currency").notNull().default("PEN"),
  totalInstallments: integer("total_installments"), // Number of cuotas
  startDate: text("start_date").notNull(),
  dueDate: text("due_date"), // Final due date
  status: text("status", { 
    enum: ["active", "paid", "overdue", "partial"] 
  }).notNull().default("active"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("debts_user_idx").on(table.userId),
  index("debts_user_status_idx").on(table.userId, table.status),
]);

export const debtsRelations = relations(debts, ({ one, many }) => ({
  user: one(users, {
    fields: [debts.userId],
    references: [users.id],
  }),
  payments: many(transactions),
  installments: many(debtInstallments),
}));

// ============================================
// DEBT INSTALLMENTS TABLE (Cuotas)
// ============================================
export const debtInstallments = sqliteTable("debt_installments", {
  id: text("id").primaryKey(),
  debtId: text("debt_id").notNull().references(() => debts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  installmentNumber: integer("installment_number").notNull(),
  amount: real("amount").notNull(),
  dueDate: text("due_date").notNull(),
  paidDate: text("paid_date"),
  status: text("status", { 
    enum: ["pending", "paid", "overdue"] 
  }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("debt_installments_debt_idx").on(table.debtId),
  index("debt_installments_user_idx").on(table.userId),
]);

export const debtInstallmentsRelations = relations(debtInstallments, ({ one }) => ({
  debt: one(debts, {
    fields: [debtInstallments.debtId],
    references: [debts.id],
  }),
  user: one(users, {
    fields: [debtInstallments.userId],
    references: [users.id],
  }),
}));

// ============================================
// LOANS TABLE (Money owed TO user)
// ============================================
export const loans = sqliteTable("loans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  borrower: text("borrower").notNull(), // Who owes user money
  borrowerContact: text("borrower_contact"), // Phone/email
  description: text("description"),
  principalAmount: real("principal_amount").notNull(),
  interestRate: real("interest_rate").default(0),
  currency: text("currency").notNull().default("PEN"),
  loanDate: text("loan_date").notNull(),
  dueDate: text("due_date"),
  status: text("status", { 
    enum: ["active", "paid", "overdue", "partial", "forgiven"] 
  }).notNull().default("active"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("loans_user_idx").on(table.userId),
  index("loans_user_status_idx").on(table.userId, table.status),
]);

export const loansRelations = relations(loans, ({ one, many }) => ({
  user: one(users, {
    fields: [loans.userId],
    references: [users.id],
  }),
  payments: many(transactions),
}));

// ============================================
// GOALS TABLE (Savings targets)
// ============================================
export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  targetAmount: real("target_amount").notNull(),
  currency: text("currency").notNull().default("PEN"),
  targetDate: text("target_date"), // Goal deadline
  icon: text("icon"),
  color: text("color"),
  autoContributePercent: real("auto_contribute_percent"), // % of income
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("goals_user_idx").on(table.userId),
  index("goals_user_active_idx").on(table.userId, table.isActive),
]);

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  contributions: many(transactions),
}));

// ============================================
// RECURRING TRANSACTIONS TABLE
// ============================================
export const recurringTransactions = sqliteTable("recurring_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => accounts.id),
  categoryId: text("category_id").references(() => categories.id),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  frequency: text("frequency", { 
    enum: ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"] 
  }).notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"), // Optional end date
  nextDueDate: text("next_due_date").notNull(), // Next scheduled execution
  dayOfMonth: integer("day_of_month"), // For monthly (1-31)
  dayOfWeek: integer("day_of_week"), // For weekly (0-6, 0=Sunday)
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastProcessedAt: text("last_processed_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("recurring_user_idx").on(table.userId),
  index("recurring_next_due_idx").on(table.nextDueDate),
  index("recurring_user_active_idx").on(table.userId, table.isActive),
]);

export const recurringTransactionsRelations = relations(recurringTransactions, ({ one, many }) => ({
  user: one(users, {
    fields: [recurringTransactions.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [recurringTransactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [recurringTransactions.categoryId],
    references: [categories.id],
  }),
  generatedTransactions: many(transactions),
}));

// ============================================
// USER SETTINGS TABLE (Configuration per user)
// ============================================
export const userSettings = sqliteTable("user_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  // UI Settings
  theme: text("theme", { enum: ["light", "dark", "system"] }).notNull().default("system"),
  language: text("language").notNull().default("es"),
  dateFormat: text("date_format").notNull().default("DD/MM/YYYY"),
  numberFormat: text("number_format").notNull().default("es-PE"), // Locale for number formatting
  // Dashboard Settings (JSON stored as text)
  dashboardConfig: text("dashboard_config").notNull().default("{}"), // JSON config
  // Notification Settings
  notifyOnDuePayments: integer("notify_on_due_payments", { mode: "boolean" }).notNull().default(true),
  notifyOnGoalProgress: integer("notify_on_goal_progress", { mode: "boolean" }).notNull().default(true),
  notifyOnRecurring: integer("notify_on_recurring", { mode: "boolean" }).notNull().default(true),
  // Display Preferences
  showCentsInAmounts: integer("show_cents_in_amounts", { mode: "boolean" }).notNull().default(true),
  defaultAccountId: text("default_account_id"),
  startOfWeek: integer("start_of_week").notNull().default(1), // 0=Sunday, 1=Monday
  fiscalMonthStart: integer("fiscal_month_start").notNull().default(1), // Day of month
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("user_settings_user_idx").on(table.userId),
]);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

// ============================================
// SCHEDULED PAYMENTS TABLE (Pagos Programados)
// ============================================
export const scheduledPayments = sqliteTable("scheduled_payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Nombre del pago
  description: text("description"),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("PEN"),
  dueDate: text("due_date").notNull(), // Fecha de vencimiento
  status: text("status", { 
    enum: ["pending", "paid", "cancelled", "overdue"] 
  }).notNull().default("pending"),
  paidDate: text("paid_date"), // Fecha en que se pagó
  paidAmount: real("paid_amount"), // Monto pagado (puede diferir del monto original)
  // Optional relations
  categoryId: text("category_id").references(() => categories.id),
  accountId: text("account_id").references(() => accounts.id), // Cuenta desde donde se pagará
  debtId: text("debt_id").references(() => debts.id), // Vinculado a una deuda
  loanId: text("loan_id").references(() => loans.id), // Vinculado a un préstamo
  debtInstallmentId: text("debt_installment_id").references(() => debtInstallments.id), // Cuota específica
  // Recurrence (for auto-creating next payment)
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  recurringFrequency: text("recurring_frequency", { 
    enum: ["weekly", "biweekly", "monthly", "quarterly", "yearly"] 
  }),
  // Priority and organization
  priority: text("priority", { 
    enum: ["low", "medium", "high", "urgent"] 
  }).notNull().default("medium"),
  tags: text("tags"), // Comma-separated tags
  notes: text("notes"),
  reminderDays: integer("reminder_days").default(3), // Days before due date to remind
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("scheduled_payments_user_idx").on(table.userId),
  index("scheduled_payments_user_status_idx").on(table.userId, table.status),
  index("scheduled_payments_user_due_idx").on(table.userId, table.dueDate),
]);

export const scheduledPaymentsRelations = relations(scheduledPayments, ({ one }) => ({
  user: one(users, {
    fields: [scheduledPayments.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [scheduledPayments.categoryId],
    references: [categories.id],
  }),
  account: one(accounts, {
    fields: [scheduledPayments.accountId],
    references: [accounts.id],
  }),
  debt: one(debts, {
    fields: [scheduledPayments.debtId],
    references: [debts.id],
  }),
  loan: one(loans, {
    fields: [scheduledPayments.loanId],
    references: [loans.id],
  }),
  debtInstallment: one(debtInstallments, {
    fields: [scheduledPayments.debtInstallmentId],
    references: [debtInstallments.id],
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type AccountType = typeof accountTypes.$inferSelect;
export type NewAccountType = typeof accountTypes.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Transfer = typeof transfers.$inferSelect;
export type NewTransfer = typeof transfers.$inferInsert;

export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;

export type DebtInstallment = typeof debtInstallments.$inferSelect;
export type NewDebtInstallment = typeof debtInstallments.$inferInsert;

export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type NewRecurringTransaction = typeof recurringTransactions.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type ScheduledPayment = typeof scheduledPayments.$inferSelect;
export type NewScheduledPayment = typeof scheduledPayments.$inferInsert;
