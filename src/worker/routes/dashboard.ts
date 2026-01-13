import { Hono } from "hono";
import { eq, and, gte, lte, desc, sql, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import {
  accounts,
  transactions,
  categories,
  goals,
  scheduledPayments,
  debts,
  loans,
  userSettings,
} from "../db/schema";
import { authMiddleware, type AuthVariables } from "../middlewares/auth";

const dashboardRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Apply auth middleware to all routes
dashboardRouter.use("*", authMiddleware);

// ============================================
// HELPER: Get date range based on period
// ============================================
function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: Date;

  switch (period) {
    case "today":
      start = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "week":
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { start: start.toISOString().split("T")[0], end };
}

// ============================================
// HELPER: Calculate account balance
// ============================================
async function calculateAccountBalance(
  db: ReturnType<typeof drizzle>,
  accountId: string,
  userId: string,
  initialBalance: number
): Promise<number> {
  // Get sum of incomes
  const [incomeResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.userId, userId),
        eq(transactions.type, "income")
      )
    );

  // Get sum of expenses and other debits
  const [expenseResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.userId, userId),
        or(
          eq(transactions.type, "expense"),
          eq(transactions.type, "debt_payment"),
          eq(transactions.type, "goal_contribution"),
          eq(transactions.type, "loan_payment")
        )
      )
    );

  return initialBalance + (incomeResult?.total || 0) - (expenseResult?.total || 0);
}

// ============================================
// MAIN DASHBOARD ENDPOINT
// ============================================
dashboardRouter.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");

  // Obtener configuración del usuario
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const config = settings?.dashboardConfig
    ? JSON.parse(settings.dashboardConfig)
    : {
        expensesPeriod: "month",
        incomePeriod: "month",
        recentTransactionsLimit: 5,
        balanceAccountIds: null,
        showScheduledPayments: true,
        scheduledPaymentsDays: 7,
      };

  // Calcular rangos de fecha
  const expensesRange = getDateRange(config.expensesPeriod || "month");
  const incomeRange = getDateRange(config.incomePeriod || "month");
  const today = new Date().toISOString().split("T")[0];

  // ============================================
  // 1. BALANCE TOTAL
  // ============================================
  const accountConditions = [eq(accounts.userId, userId), eq(accounts.isActive, true)];
  if (config.balanceAccountIds && config.balanceAccountIds.length > 0) {
    const accountFilters = config.balanceAccountIds.map((id: string) =>
      eq(accounts.id, id)
    );
    if (accountFilters.length > 0) {
      accountConditions.push(or(...accountFilters)!);
    }
  }

  const rawAccounts = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      initialBalance: accounts.initialBalance,
      currency: accounts.currency,
    })
    .from(accounts)
    .where(and(...accountConditions));

  // Calculate balance for each account
  const accountsList = await Promise.all(
    rawAccounts.map(async (acc) => ({
      id: acc.id,
      name: acc.name,
      balance: await calculateAccountBalance(db, acc.id, userId, acc.initialBalance),
      currency: acc.currency,
    }))
  );

  const totalBalance = accountsList.reduce((sum, acc) => sum + acc.balance, 0);

  // ============================================
  // 2. GASTOS DEL PERÍODO
  // ============================================
  const [expenseResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, expensesRange.start),
        lte(transactions.date, expensesRange.end)
      )
    );

  // ============================================
  // 3. INGRESOS DEL PERÍODO
  // ============================================
  const [incomeResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "income"),
        gte(transactions.date, incomeRange.start),
        lte(transactions.date, incomeRange.end)
      )
    );

  // ============================================
  // 4. TRANSACCIONES RECIENTES
  // ============================================
  const recentTransactions = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      description: transactions.description,
      date: transactions.date,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      accountName: accounts.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(config.recentTransactionsLimit || 5);

  // ============================================
  // 5. METAS ACTIVAS
  // ============================================
  const rawGoals = await db
    .select({
      id: goals.id,
      name: goals.name,
      targetAmount: goals.targetAmount,
      targetDate: goals.targetDate,
      icon: goals.icon,
      color: goals.color,
    })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.isActive, true), eq(goals.isCompleted, false)))
    .orderBy(goals.targetDate)
    .limit(5);

  // Calculate current amount for each goal from goal_contribution transactions
  const goalsWithProgress = await Promise.all(
    rawGoals.map(async (goal) => {
      const [contributionResult] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.goalId, goal.id),
            eq(transactions.type, "goal_contribution")
          )
        );
      
      const currentAmount = contributionResult?.total || 0;
      
      return {
        ...goal,
        currentAmount,
        progress: Math.round((currentAmount / goal.targetAmount) * 100),
        remaining: goal.targetAmount - currentAmount,
        daysRemaining: goal.targetDate
          ? Math.ceil(
              (new Date(goal.targetDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
      };
    })
  );

  // ============================================
  // 6. PAGOS PROGRAMADOS PRÓXIMOS
  // ============================================
  let upcomingPayments: Array<{
    id: string;
    name: string;
    amount: number;
    dueDate: string;
    status: string;
    priority: string;
    categoryName: string | null;
    daysUntilDue: number;
    isOverdue: boolean;
  }> = [];
  
  if (config.showScheduledPayments !== false) {
    const paymentsDaysAhead = config.scheduledPaymentsDays || 7;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + paymentsDaysAhead);

    // First, mark overdue payments
    await db
      .update(scheduledPayments)
      .set({ status: "overdue", updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(scheduledPayments.userId, userId),
          eq(scheduledPayments.status, "pending"),
          lte(scheduledPayments.dueDate, today)
        )
      );

    const payments = await db
      .select({
        id: scheduledPayments.id,
        name: scheduledPayments.name,
        amount: scheduledPayments.amount,
        dueDate: scheduledPayments.dueDate,
        status: scheduledPayments.status,
        priority: scheduledPayments.priority,
        categoryName: categories.name,
      })
      .from(scheduledPayments)
      .leftJoin(categories, eq(scheduledPayments.categoryId, categories.id))
      .where(
        and(
          eq(scheduledPayments.userId, userId),
          or(
            eq(scheduledPayments.status, "pending"),
            eq(scheduledPayments.status, "overdue")
          ),
          lte(scheduledPayments.dueDate, endDate.toISOString().split("T")[0])
        )
      )
      .orderBy(scheduledPayments.dueDate)
      .limit(10);

    upcomingPayments = payments.map((p) => ({
      ...p,
      daysUntilDue: Math.ceil(
        (new Date(p.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
      isOverdue: p.status === "overdue",
    }));
  }

  // ============================================
  // 7. RESUMEN DE DEUDAS
  // ============================================
  const debtsList = await db
    .select({
      id: debts.id,
      status: debts.status,
      principalAmount: debts.principalAmount,
    })
    .from(debts)
    .where(eq(debts.userId, userId));

  // Calculate paid amount for each debt
  const debtsWithPaid = await Promise.all(
    debtsList.map(async (debt) => {
      const [paidResult] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.debtId, debt.id),
            eq(transactions.type, "debt_payment")
          )
        );
      return {
        ...debt,
        paidAmount: paidResult?.total || 0,
      };
    })
  );

  const debtsSummary = {
    total: debtsWithPaid.length,
    active: debtsWithPaid.filter((d) => d.status === "active").length,
    totalOwed: debtsWithPaid
      .filter((d) => d.status === "active")
      .reduce((sum, d) => sum + (d.principalAmount - d.paidAmount), 0),
  };

  // ============================================
  // 8. RESUMEN DE PRÉSTAMOS
  // ============================================
  const loansList = await db
    .select({
      id: loans.id,
      status: loans.status,
      principalAmount: loans.principalAmount,
    })
    .from(loans)
    .where(eq(loans.userId, userId));

  // Calculate received amount for each loan
  const loansWithReceived = await Promise.all(
    loansList.map(async (loan) => {
      const [receivedResult] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.loanId, loan.id),
            eq(transactions.type, "loan_payment")
          )
        );
      return {
        ...loan,
        receivedAmount: receivedResult?.total || 0,
      };
    })
  );

  const loansSummary = {
    total: loansWithReceived.length,
    active: loansWithReceived.filter((l) => l.status === "active").length,
    totalToReceive: loansWithReceived
      .filter((l) => l.status === "active")
      .reduce((sum, l) => sum + (l.principalAmount - l.receivedAmount), 0),
  };

  // ============================================
  // 9. GASTOS POR CATEGORÍA (período actual)
  // ============================================
  const categoryBreakdown = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, expensesRange.start),
        lte(transactions.date, expensesRange.end)
      )
    )
    .groupBy(transactions.categoryId, categories.name, categories.icon, categories.color)
    .orderBy(desc(sql`SUM(${transactions.amount})`))
    .limit(6);

  // Calcular porcentajes
  const totalExpenses = expenseResult?.total || 0;
  const categoryBreakdownWithPercentage = categoryBreakdown.map((cat) => ({
    ...cat,
    percentage:
      totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0,
  }));

  // ============================================
  // RESPONSE
  // ============================================
  return c.json({
    data: {
      // Balance general
      balance: {
        total: totalBalance,
        accounts: accountsList,
      },

      // Gastos del período
      expenses: {
        total: expenseResult?.total || 0,
        count: expenseResult?.count || 0,
        period: config.expensesPeriod || "month",
        dateRange: expensesRange,
      },

      // Ingresos del período
      income: {
        total: incomeResult?.total || 0,
        count: incomeResult?.count || 0,
        period: config.incomePeriod || "month",
        dateRange: incomeRange,
      },

      // Net (ingresos - gastos)
      net: {
        amount: (incomeResult?.total || 0) - (expenseResult?.total || 0),
        isPositive: (incomeResult?.total || 0) >= (expenseResult?.total || 0),
      },

      // Transacciones recientes
      recentTransactions,

      // Metas activas
      goals: goalsWithProgress,

      // Pagos programados próximos
      scheduledPayments: {
        upcoming: upcomingPayments,
        overdueCount: upcomingPayments.filter((p) => p.isOverdue).length,
        totalDue: upcomingPayments.reduce((sum, p) => sum + p.amount, 0),
      },

      // Resumen deudas y préstamos
      debts: debtsSummary,
      loans: loansSummary,

      // Desglose por categoría
      categoryBreakdown: categoryBreakdownWithPercentage,
    },
    config: {
      expensesPeriod: config.expensesPeriod,
      incomePeriod: config.incomePeriod,
      recentTransactionsLimit: config.recentTransactionsLimit,
      scheduledPaymentsDays: config.scheduledPaymentsDays,
    },
  });
});

// ============================================
// SUMMARY WIDGET (lightweight)
// ============================================
dashboardRouter.get("/summary", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const period = c.req.query("period") || "month";

  const range = getDateRange(period);

  // Get all accounts and calculate total balance
  const rawAccounts = await db
    .select({
      id: accounts.id,
      initialBalance: accounts.initialBalance,
    })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.isActive, true)));

  let totalBalance = 0;
  for (const acc of rawAccounts) {
    totalBalance += await calculateAccountBalance(db, acc.id, userId, acc.initialBalance);
  }

  // Gastos e ingresos del período
  const [expenseResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, range.start),
        lte(transactions.date, range.end)
      )
    );

  const [incomeResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "income"),
        gte(transactions.date, range.start),
        lte(transactions.date, range.end)
      )
    );

  // Pagos pendientes
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const [pendingPayments] = await db
    .select({
      count: sql<number>`COUNT(*)`,
      total: sql<number>`COALESCE(SUM(${scheduledPayments.amount}), 0)`,
    })
    .from(scheduledPayments)
    .where(
      and(
        eq(scheduledPayments.userId, userId),
        or(
          eq(scheduledPayments.status, "pending"),
          eq(scheduledPayments.status, "overdue")
        ),
        lte(scheduledPayments.dueDate, nextWeek.toISOString().split("T")[0])
      )
    );

  return c.json({
    data: {
      balance: totalBalance,
      expenses: expenseResult?.total || 0,
      income: incomeResult?.total || 0,
      net: (incomeResult?.total || 0) - (expenseResult?.total || 0),
      pendingPayments: {
        count: pendingPayments?.count || 0,
        total: pendingPayments?.total || 0,
      },
      period,
      dateRange: range,
    },
  });
});

// ============================================
// TRENDS (comparación con período anterior)
// ============================================
dashboardRouter.get("/trends", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const period = c.req.query("period") || "month";

  const currentRange = getDateRange(period);

  // Calcular período anterior
  const currentStart = new Date(currentRange.start);
  const currentEnd = new Date(currentRange.end);
  const periodLength = currentEnd.getTime() - currentStart.getTime();

  const previousStart = new Date(currentStart.getTime() - periodLength);
  const previousEnd = new Date(currentStart.getTime() - 1);

  const previousRange = {
    start: previousStart.toISOString().split("T")[0],
    end: previousEnd.toISOString().split("T")[0],
  };

  // Gastos período actual
  const [currentExpenses] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, currentRange.start),
        lte(transactions.date, currentRange.end)
      )
    );

  // Gastos período anterior
  const [previousExpenses] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, previousRange.start),
        lte(transactions.date, previousRange.end)
      )
    );

  // Ingresos período actual
  const [currentIncome] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "income"),
        gte(transactions.date, currentRange.start),
        lte(transactions.date, currentRange.end)
      )
    );

  // Ingresos período anterior
  const [previousIncome] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "income"),
        gte(transactions.date, previousRange.start),
        lte(transactions.date, previousRange.end)
      )
    );

  // Calcular cambios porcentuales
  const expensesChange =
    previousExpenses?.total && previousExpenses.total > 0
      ? Math.round(
          ((currentExpenses?.total || 0) - previousExpenses.total) /
            previousExpenses.total *
            100
        )
      : 0;

  const incomeChange =
    previousIncome?.total && previousIncome.total > 0
      ? Math.round(
          ((currentIncome?.total || 0) - previousIncome.total) /
            previousIncome.total *
            100
        )
      : 0;

  return c.json({
    data: {
      expenses: {
        current: currentExpenses?.total || 0,
        previous: previousExpenses?.total || 0,
        change: expensesChange,
        trend: expensesChange > 0 ? "up" : expensesChange < 0 ? "down" : "stable",
      },
      income: {
        current: currentIncome?.total || 0,
        previous: previousIncome?.total || 0,
        change: incomeChange,
        trend: incomeChange > 0 ? "up" : incomeChange < 0 ? "down" : "stable",
      },
      savings: {
        current: (currentIncome?.total || 0) - (currentExpenses?.total || 0),
        previous: (previousIncome?.total || 0) - (previousExpenses?.total || 0),
      },
      period,
      currentRange,
      previousRange,
    },
  });
});

export default dashboardRouter;
