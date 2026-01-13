import { z } from "zod";

// ============================================
// AUTH SCHEMAS
// ============================================
export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  currency: z.string().length(3).default("PEN"),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

// ============================================
// ACCOUNT TYPE SCHEMAS
// ============================================
export const createAccountTypeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  icon: z.string().optional(),
});

export const updateAccountTypeSchema = createAccountTypeSchema.partial();

// ============================================
// ACCOUNT SCHEMAS
// ============================================
export const createAccountSchema = z.object({
  accountTypeId: z.string().uuid("ID de tipo de cuenta inválido"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  currency: z.string().length(3).default("PEN"),
  initialBalance: z.number().default(0),
  color: z.string().optional(),
  icon: z.string().optional(),
  includeInTotal: z.boolean().default(true),
});

export const updateAccountSchema = z.object({
  accountTypeId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
  includeInTotal: z.boolean().optional(),
});

// ============================================
// CATEGORY SCHEMAS
// ============================================
export const createCategorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  type: z.enum(["income", "expense"]),
  parentId: z.string().uuid().optional().nullable(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// TRANSACTION SCHEMAS
// ============================================
export const createTransactionSchema = z.object({
  accountId: z.string().uuid("ID de cuenta inválido"),
  categoryId: z.string().uuid("ID de categoría inválido").optional().nullable(),
  type: z.enum(["income", "expense", "debt_payment", "goal_contribution", "loan_payment"]),
  amount: z.number().positive("El monto debe ser positivo"),
  description: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  debtId: z.string().uuid().optional().nullable(),
  loanId: z.string().uuid().optional().nullable(),
  goalId: z.string().uuid().optional().nullable(),
});

export const updateTransactionSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  type: z.enum(["income", "expense", "debt_payment", "goal_contribution", "loan_payment"]).optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const transactionFiltersSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(["income", "expense", "debt_payment", "goal_contribution", "loan_payment"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// TRANSFER SCHEMAS
// ============================================
export const createTransferSchema = z.object({
  fromAccountId: z.string().uuid("ID de cuenta origen inválido"),
  toAccountId: z.string().uuid("ID de cuenta destino inválido"),
  amount: z.number().positive("El monto debe ser positivo"),
  fee: z.number().min(0).default(0),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "Las cuentas de origen y destino deben ser diferentes",
  path: ["toAccountId"],
});

// ============================================
// DEBT SCHEMAS
// ============================================
export const createDebtSchema = z.object({
  creditor: z.string().min(1, "El acreedor es requerido"),
  description: z.string().optional(),
  principalAmount: z.number().positive("El monto debe ser positivo"),
  interestRate: z.number().min(0).default(0),
  currency: z.string().length(3).default("PEN"),
  totalInstallments: z.number().int().positive().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

export const updateDebtSchema = z.object({
  creditor: z.string().min(1).optional(),
  description: z.string().optional(),
  interestRate: z.number().min(0).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(["active", "paid", "overdue", "partial"]).optional(),
  notes: z.string().optional(),
});

// ============================================
// LOAN SCHEMAS
// ============================================
export const createLoanSchema = z.object({
  borrower: z.string().min(1, "El prestatario es requerido"),
  borrowerContact: z.string().optional(),
  description: z.string().optional(),
  principalAmount: z.number().positive("El monto debe ser positivo"),
  interestRate: z.number().min(0).default(0),
  currency: z.string().length(3).default("PEN"),
  loanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

export const updateLoanSchema = z.object({
  borrower: z.string().min(1).optional(),
  borrowerContact: z.string().optional().nullable(),
  description: z.string().optional(),
  interestRate: z.number().min(0).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(["active", "paid", "overdue", "partial", "forgiven"]).optional(),
  notes: z.string().optional(),
});

// ============================================
// GOAL SCHEMAS
// ============================================
export const createGoalSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  targetAmount: z.number().positive("El monto objetivo debe ser positivo"),
  currency: z.string().length(3).default("PEN"),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  autoContributePercent: z.number().min(0).max(100).optional(),
});

export const updateGoalSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  icon: z.string().optional(),
  color: z.string().optional(),
  autoContributePercent: z.number().min(0).max(100).optional().nullable(),
  isActive: z.boolean().optional(),
});

// ============================================
// RECURRING TRANSACTION SCHEMAS
// ============================================
export const createRecurringTransactionSchema = z.object({
  accountId: z.string().uuid("ID de cuenta inválido"),
  categoryId: z.string().uuid().optional().nullable(),
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("El monto debe ser positivo"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
});

export const updateRecurringTransactionSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  amount: z.number().positive().optional(),
  description: z.string().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  isActive: z.boolean().optional(),
});

// ============================================
// USER SETTINGS SCHEMAS
// ============================================
export const updateUserSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.string().min(2).max(5).optional(),
  dateFormat: z.string().optional(),
  numberFormat: z.string().optional(),
  dashboardConfig: z.record(z.string(), z.unknown()).optional(), // JSON object
  notifyOnDuePayments: z.boolean().optional(),
  notifyOnGoalProgress: z.boolean().optional(),
  notifyOnRecurring: z.boolean().optional(),
  showCentsInAmounts: z.boolean().optional(),
  defaultAccountId: z.string().uuid().optional().nullable(),
  startOfWeek: z.number().int().min(0).max(6).optional(),
  fiscalMonthStart: z.number().int().min(1).max(28).optional(),
});

// Dashboard configuration schema
export const dashboardConfigSchema = z.object({
  // Time period for expenses widget
  expensesPeriod: z.enum(["today", "week", "month", "quarter", "year"]).default("month"),
  // Time period for income widget
  incomePeriod: z.enum(["today", "week", "month", "quarter", "year"]).default("month"),
  // Number of recent transactions to show
  recentTransactionsLimit: z.number().int().min(3).max(20).default(5),
  // Which accounts to show in balance widget (null = all)
  balanceAccountIds: z.array(z.string().uuid()).nullable().default(null),
  // Goals to show on dashboard (null = all active)
  dashboardGoalIds: z.array(z.string().uuid()).nullable().default(null),
  // Show scheduled payments on dashboard
  showScheduledPayments: z.boolean().default(true),
  scheduledPaymentsDays: z.number().int().min(1).max(30).default(7), // Days ahead to show
  // Widgets visibility and order
  widgetsOrder: z.array(z.enum([
    "balance", 
    "expenses", 
    "income", 
    "transactions", 
    "goals", 
    "scheduled_payments",
    "debts_summary",
    "category_breakdown"
  ])).default(["balance", "expenses", "income", "transactions", "goals", "scheduled_payments"]),
  // Category breakdown settings
  categoryBreakdownPeriod: z.enum(["week", "month", "quarter", "year"]).default("month"),
  categoryBreakdownType: z.enum(["income", "expense"]).default("expense"),
});

// ============================================
// SCHEDULED PAYMENTS SCHEMAS
// ============================================
export const createScheduledPaymentSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  amount: z.number().positive("El monto debe ser positivo"),
  currency: z.string().length(3).default("PEN"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  categoryId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  debtId: z.string().uuid().optional().nullable(),
  loanId: z.string().uuid().optional().nullable(),
  debtInstallmentId: z.string().uuid().optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(["weekly", "biweekly", "monthly", "quarterly", "yearly"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  tags: z.string().optional(),
  notes: z.string().optional(),
  reminderDays: z.number().int().min(0).max(30).default(3),
});

export const updateScheduledPaymentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  amount: z.number().positive().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["pending", "paid", "cancelled", "overdue"]).optional(),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  paidAmount: z.number().positive().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  tags: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  reminderDays: z.number().int().min(0).max(30).optional(),
});

export const markPaymentAsPaidSchema = z.object({
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paidAmount: z.number().positive().optional(),
  createNextRecurrence: z.boolean().default(true), // Auto-create next payment if recurring
});

export const scheduledPaymentFiltersSchema = z.object({
  status: z.enum(["pending", "paid", "cancelled", "overdue"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  includeOverdue: z.coerce.boolean().default(true),
});

// ============================================
// TYPE EXPORTS
// ============================================
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAccountTypeInput = z.infer<typeof createAccountTypeSchema>;
export type UpdateAccountTypeInput = z.infer<typeof updateAccountTypeSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type CreateDebtInput = z.infer<typeof createDebtSchema>;
export type UpdateDebtInput = z.infer<typeof updateDebtSchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type CreateRecurringTransactionInput = z.infer<typeof createRecurringTransactionSchema>;
export type UpdateRecurringTransactionInput = z.infer<typeof updateRecurringTransactionSchema>;
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
export type DashboardConfig = z.infer<typeof dashboardConfigSchema>;
export type CreateScheduledPaymentInput = z.infer<typeof createScheduledPaymentSchema>;
export type UpdateScheduledPaymentInput = z.infer<typeof updateScheduledPaymentSchema>;
export type MarkPaymentAsPaidInput = z.infer<typeof markPaymentAsPaidSchema>;
export type ScheduledPaymentFilters = z.infer<typeof scheduledPaymentFiltersSchema>;
