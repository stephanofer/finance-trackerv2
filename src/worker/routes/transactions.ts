import { Hono } from "hono";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { createDb, transactions, accounts, categories } from "../db";
import { 
  createTransactionSchema, 
  updateTransactionSchema,
  transactionFiltersSchema 
} from "../lib/validators";
import { generateId } from "../lib/crypto";
import { authMiddleware, type AuthVariables } from "../middlewares/auth";

const transactionsRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Apply auth middleware to all routes
transactionsRouter.use("*", authMiddleware);

// ============================================
// GET /transactions - List transactions with filters and pagination
// ============================================
transactionsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  
  const queryParams = {
    accountId: c.req.query("accountId"),
    categoryId: c.req.query("categoryId"),
    type: c.req.query("type"),
    startDate: c.req.query("startDate"),
    endDate: c.req.query("endDate"),
    page: c.req.query("page"),
    limit: c.req.query("limit"),
  };

  const result = transactionFiltersSchema.safeParse(queryParams);
  
  if (!result.success) {
    return c.json({
      error: "Parámetros inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const { accountId, categoryId, type, startDate, endDate, page, limit } = result.data;
  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [eq(transactions.userId, userId)];
  
  if (accountId) conditions.push(eq(transactions.accountId, accountId));
  if (categoryId) conditions.push(eq(transactions.categoryId, categoryId));
  if (type) conditions.push(eq(transactions.type, type));
  if (startDate) conditions.push(gte(transactions.date, startDate));
  if (endDate) conditions.push(lte(transactions.date, endDate));

  // Get transactions with relations
  const transactionsList = await db.query.transactions.findMany({
    where: and(...conditions),
    with: {
      account: {
        columns: { id: true, name: true, color: true },
      },
      category: {
        columns: { id: true, name: true, icon: true, color: true },
      },
    },
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    limit,
    offset,
  });

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(transactions)
    .where(and(...conditions));

  const totalCount = countResult?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Calculate totals for the filtered period
  const [incomeTotal] = await db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(...conditions, eq(transactions.type, "income")));

  const [expenseTotal] = await db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(...conditions, eq(transactions.type, "expense")));

  return c.json({
    transactions: transactionsList,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasMore: page < totalPages,
    },
    summary: {
      totalIncome: incomeTotal?.total || 0,
      totalExpense: expenseTotal?.total || 0,
      netBalance: (incomeTotal?.total || 0) - (expenseTotal?.total || 0),
    },
  });
});

// ============================================
// GET /transactions/:id - Get single transaction
// ============================================
transactionsRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const transactionId = c.req.param("id");
  const db = createDb(c.env.DB);

  const transaction = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, transactionId), eq(transactions.userId, userId)),
    with: {
      account: true,
      category: true,
      debt: true,
      loan: true,
      goal: true,
    },
  });

  if (!transaction) {
    return c.json({ error: "Transacción no encontrada" }, 404);
  }

  return c.json({ transaction });
});

// ============================================
// POST /transactions - Create new transaction
// ============================================
transactionsRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const result = createTransactionSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);
  const { accountId, categoryId, ...transactionData } = result.data;

  // Verify account belongs to user
  const account = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .get();

  if (!account) {
    return c.json({ error: "Cuenta no encontrada" }, 404);
  }

  // Verify category belongs to user (if provided)
  if (categoryId) {
    const category = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .get();

    if (!category) {
      return c.json({ error: "Categoría no encontrada" }, 404);
    }
  }

  const transactionId = generateId();

  await db.insert(transactions).values({
    id: transactionId,
    userId,
    accountId,
    categoryId: categoryId || null,
    ...transactionData,
  });

  const newTransaction = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
    with: {
      account: {
        columns: { id: true, name: true, color: true },
      },
      category: {
        columns: { id: true, name: true, icon: true, color: true },
      },
    },
  });

  return c.json({
    message: "Transacción creada exitosamente",
    transaction: newTransaction,
  }, 201);
});

// ============================================
// PATCH /transactions/:id - Update transaction
// ============================================
transactionsRouter.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const transactionId = c.req.param("id");
  const body = await c.req.json();
  const result = updateTransactionSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Transacción no encontrada" }, 404);
  }

  // Verify account if updating
  if (result.data.accountId) {
    const account = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, result.data.accountId), eq(accounts.userId, userId)))
      .get();

    if (!account) {
      return c.json({ error: "Cuenta no encontrada" }, 404);
    }
  }

  // Verify category if updating
  if (result.data.categoryId) {
    const category = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, result.data.categoryId), eq(categories.userId, userId)))
      .get();

    if (!category) {
      return c.json({ error: "Categoría no encontrada" }, 404);
    }
  }

  await db
    .update(transactions)
    .set({
      ...result.data,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

  const updated = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
    with: {
      account: {
        columns: { id: true, name: true, color: true },
      },
      category: {
        columns: { id: true, name: true, icon: true, color: true },
      },
    },
  });

  return c.json({
    message: "Transacción actualizada exitosamente",
    transaction: updated,
  });
});

// ============================================
// DELETE /transactions/:id - Delete transaction
// ============================================
transactionsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const transactionId = c.req.param("id");
  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Transacción no encontrada" }, 404);
  }

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));

  return c.json({ message: "Transacción eliminada exitosamente" });
});

// ============================================
// GET /transactions/summary/by-category - Group by category
// ============================================
transactionsRouter.get("/summary/by-category", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const type = c.req.query("type") as "income" | "expense" | undefined;
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [eq(transactions.userId, userId)];
  if (type) conditions.push(eq(transactions.type, type));
  if (startDate) conditions.push(gte(transactions.date, startDate));
  if (endDate) conditions.push(lte(transactions.date, endDate));

  const summary = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      total: sql<number>`SUM(${transactions.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conditions))
    .groupBy(transactions.categoryId)
    .orderBy(desc(sql`SUM(${transactions.amount})`));

  return c.json({ summary });
});

export default transactionsRouter;
