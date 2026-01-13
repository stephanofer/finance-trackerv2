import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { createDb, loans, transactions } from "../db";
import { createLoanSchema, updateLoanSchema } from "../lib/validators";
import { generateId } from "../lib/crypto";
import { authMiddleware, type AuthVariables } from "../middlewares/auth";

const loansRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Apply auth middleware to all routes
loansRouter.use("*", authMiddleware);

// ============================================
// GET /loans - List all loans
// ============================================
loansRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const status = c.req.query("status") as "active" | "paid" | "overdue" | "partial" | "forgiven" | undefined;

  const conditions = [eq(loans.userId, userId)];
  if (status) conditions.push(eq(loans.status, status));

  const loansList = await db
    .select()
    .from(loans)
    .where(and(...conditions))
    .orderBy(loans.createdAt);

  // Calculate received amount for each loan
  const loansWithReceivedAmount = await Promise.all(
    loansList.map(async (loan) => {
      const [receivedResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.loanId, loan.id),
            eq(transactions.type, "loan_payment")
          )
        );

      const receivedAmount = receivedResult?.total || 0;
      const remainingAmount = loan.principalAmount - receivedAmount;
      const progress = (receivedAmount / loan.principalAmount) * 100;

      return {
        ...loan,
        receivedAmount,
        remainingAmount,
        progress: Math.min(progress, 100),
      };
    })
  );

  return c.json({ loans: loansWithReceivedAmount });
});

// ============================================
// GET /loans/:id - Get single loan with details
// ============================================
loansRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const loanId = c.req.param("id");
  const db = createDb(c.env.DB);

  const loan = await db
    .select()
    .from(loans)
    .where(and(eq(loans.id, loanId), eq(loans.userId, userId)))
    .get();

  if (!loan) {
    return c.json({ error: "Préstamo no encontrado" }, 404);
  }

  // Get payment history (payments received)
  const paymentHistory = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      eq(transactions.loanId, loanId),
      eq(transactions.type, "loan_payment")
    ),
    orderBy: (transactions, { desc }) => [desc(transactions.date)],
  });

  // Calculate totals
  const receivedAmount = paymentHistory.reduce((sum, t) => sum + t.amount, 0);
  const remainingAmount = loan.principalAmount - receivedAmount;

  return c.json({
    loan: {
      ...loan,
      receivedAmount,
      remainingAmount,
      progress: Math.min((receivedAmount / loan.principalAmount) * 100, 100),
    },
    paymentHistory,
  });
});

// ============================================
// POST /loans - Create new loan
// ============================================
loansRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const result = createLoanSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);
  const loanId = generateId();

  await db.insert(loans).values({
    id: loanId,
    userId,
    ...result.data,
  });

  const newLoan = await db
    .select()
    .from(loans)
    .where(eq(loans.id, loanId))
    .get();

  return c.json({
    message: "Préstamo creado exitosamente",
    loan: {
      ...newLoan,
      receivedAmount: 0,
      remainingAmount: result.data.principalAmount,
      progress: 0,
    },
  }, 201);
});

// ============================================
// PATCH /loans/:id - Update loan
// ============================================
loansRouter.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const loanId = c.req.param("id");
  const body = await c.req.json();
  const result = updateLoanSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: loans.id })
    .from(loans)
    .where(and(eq(loans.id, loanId), eq(loans.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Préstamo no encontrado" }, 404);
  }

  await db
    .update(loans)
    .set({
      ...result.data,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(loans.id, loanId), eq(loans.userId, userId)));

  const updated = await db
    .select()
    .from(loans)
    .where(eq(loans.id, loanId))
    .get();

  return c.json({
    message: "Préstamo actualizado exitosamente",
    loan: updated,
  });
});

// ============================================
// DELETE /loans/:id - Delete loan
// ============================================
loansRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const loanId = c.req.param("id");
  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: loans.id })
    .from(loans)
    .where(and(eq(loans.id, loanId), eq(loans.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Préstamo no encontrado" }, 404);
  }

  await db
    .delete(loans)
    .where(and(eq(loans.id, loanId), eq(loans.userId, userId)));

  return c.json({ message: "Préstamo eliminado exitosamente" });
});

// ============================================
// POST /loans/:id/forgive - Forgive loan
// ============================================
loansRouter.post("/:id/forgive", async (c) => {
  const userId = c.get("userId");
  const loanId = c.req.param("id");
  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: loans.id })
    .from(loans)
    .where(and(eq(loans.id, loanId), eq(loans.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Préstamo no encontrado" }, 404);
  }

  await db
    .update(loans)
    .set({
      status: "forgiven",
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(loans.id, loanId), eq(loans.userId, userId)));

  return c.json({ message: "Préstamo perdonado exitosamente" });
});

export default loansRouter;
