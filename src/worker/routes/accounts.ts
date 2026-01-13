import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { createDb, accounts, accountTypes, transactions, transfers } from "../db";
import { createAccountSchema, updateAccountSchema } from "../lib/validators";
import { generateId } from "../lib/crypto";
import { authMiddleware, type AuthVariables } from "../middlewares/auth";

const accountsRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Apply auth middleware to all routes
accountsRouter.use("*", authMiddleware);

// ============================================
// GET /accounts - List all accounts with balances
// ============================================
accountsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const includeInactive = c.req.query("includeInactive") === "true";

  // Get all accounts for user
  const accountsList = await db.query.accounts.findMany({
    where: includeInactive 
      ? eq(accounts.userId, userId)
      : and(eq(accounts.userId, userId), eq(accounts.isActive, true)),
    with: {
      accountType: true,
    },
    orderBy: (accounts, { desc }) => [desc(accounts.createdAt)],
  });

  // Calculate balances for each account
  const accountsWithBalances = await Promise.all(
    accountsList.map(async (account) => {
      // Calculate balance from transactions
      const [incomeResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, account.id),
            eq(transactions.userId, userId),
            eq(transactions.type, "income")
          )
        );

      const [expenseResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, account.id),
            eq(transactions.userId, userId),
            eq(transactions.type, "expense")
          )
        );

      // Calculate transfers in and out
      const [transfersInResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${transfers.amount}), 0)` })
        .from(transfers)
        .where(
          and(
            eq(transfers.toAccountId, account.id),
            eq(transfers.userId, userId)
          )
        );

      const [transfersOutResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${transfers.amount} + COALESCE(${transfers.fee}, 0)), 0)` })
        .from(transfers)
        .where(
          and(
            eq(transfers.fromAccountId, account.id),
            eq(transfers.userId, userId)
          )
        );

      const income = incomeResult?.total || 0;
      const expense = expenseResult?.total || 0;
      const transfersIn = transfersInResult?.total || 0;
      const transfersOut = transfersOutResult?.total || 0;

      const balance = account.initialBalance + income - expense + transfersIn - transfersOut;

      return {
        ...account,
        balance,
        stats: {
          totalIncome: income,
          totalExpense: expense,
          transfersIn,
          transfersOut,
        },
      };
    })
  );

  // Calculate total balance
  const totalBalance = accountsWithBalances
    .filter((a) => a.includeInTotal && a.isActive)
    .reduce((sum, a) => sum + a.balance, 0);

  return c.json({
    accounts: accountsWithBalances,
    totalBalance,
    count: accountsWithBalances.length,
  });
});

// ============================================
// GET /accounts/:id - Get single account with balance
// ============================================
accountsRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const accountId = c.req.param("id");
  const db = createDb(c.env.DB);

  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, accountId), eq(accounts.userId, userId)),
    with: {
      accountType: true,
    },
  });

  if (!account) {
    return c.json({ error: "Cuenta no encontrada" }, 404);
  }

  // Calculate balance
  const [incomeResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.userId, userId),
        eq(transactions.type, "income")
      )
    );

  const [expenseResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.userId, userId),
        eq(transactions.type, "expense")
      )
    );

  const balance = account.initialBalance + (incomeResult?.total || 0) - (expenseResult?.total || 0);

  return c.json({
    account: {
      ...account,
      balance,
    },
  });
});

// ============================================
// POST /accounts - Create new account
// ============================================
accountsRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const result = createAccountSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);
  const { accountTypeId, ...accountData } = result.data;

  // Verify account type belongs to user
  const accountType = await db
    .select()
    .from(accountTypes)
    .where(and(eq(accountTypes.id, accountTypeId), eq(accountTypes.userId, userId)))
    .get();

  if (!accountType) {
    return c.json({ error: "Tipo de cuenta no encontrado" }, 404);
  }

  const accountId = generateId();

  await db.insert(accounts).values({
    id: accountId,
    userId,
    accountTypeId,
    ...accountData,
  });

  const newAccount = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
    with: {
      accountType: true,
    },
  });

  return c.json({
    message: "Cuenta creada exitosamente",
    account: {
      ...newAccount,
      balance: newAccount?.initialBalance || 0,
    },
  }, 201);
});

// ============================================
// PATCH /accounts/:id - Update account
// ============================================
accountsRouter.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const accountId = c.req.param("id");
  const body = await c.req.json();
  const result = updateAccountSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);

  // Verify ownership
  const existingAccount = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .get();

  if (!existingAccount) {
    return c.json({ error: "Cuenta no encontrada" }, 404);
  }

  // If updating accountTypeId, verify it belongs to user
  if (result.data.accountTypeId) {
    const accountType = await db
      .select()
      .from(accountTypes)
      .where(and(eq(accountTypes.id, result.data.accountTypeId), eq(accountTypes.userId, userId)))
      .get();

    if (!accountType) {
      return c.json({ error: "Tipo de cuenta no encontrado" }, 404);
    }
  }

  await db
    .update(accounts)
    .set({
      ...result.data,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

  const updatedAccount = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
    with: {
      accountType: true,
    },
  });

  return c.json({
    message: "Cuenta actualizada exitosamente",
    account: updatedAccount,
  });
});

// ============================================
// DELETE /accounts/:id - Soft delete account
// ============================================
accountsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const accountId = c.req.param("id");
  const db = createDb(c.env.DB);

  // Verify ownership
  const existingAccount = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .get();

  if (!existingAccount) {
    return c.json({ error: "Cuenta no encontrada" }, 404);
  }

  // Soft delete by setting isActive to false
  await db
    .update(accounts)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

  return c.json({ message: "Cuenta eliminada exitosamente" });
});

export default accountsRouter;
