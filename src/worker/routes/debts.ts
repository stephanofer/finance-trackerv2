import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { createDb, debts, debtInstallments, transactions } from "../db";
import { createDebtSchema, updateDebtSchema } from "../lib/validators";
import { generateId } from "../lib/crypto";
import { authMiddleware, type AuthVariables } from "../middlewares/auth";

const debtsRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Apply auth middleware to all routes
debtsRouter.use("*", authMiddleware);

// ============================================
// GET /debts - List all debts
// ============================================
debtsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const status = c.req.query("status") as "active" | "paid" | "overdue" | "partial" | undefined;

  const conditions = [eq(debts.userId, userId)];
  if (status) conditions.push(eq(debts.status, status));

  const debtsList = await db.query.debts.findMany({
    where: and(...conditions),
    with: {
      installments: true,
    },
    orderBy: (debts, { desc }) => [desc(debts.createdAt)],
  });

  // Calculate paid amount for each debt
  const debtsWithPaidAmount = await Promise.all(
    debtsList.map(async (debt) => {
      const [paidResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.debtId, debt.id),
            eq(transactions.type, "debt_payment")
          )
        );

      const paidAmount = paidResult?.total || 0;
      const remainingAmount = debt.principalAmount - paidAmount;
      const progress = (paidAmount / debt.principalAmount) * 100;

      return {
        ...debt,
        paidAmount,
        remainingAmount,
        progress: Math.min(progress, 100),
      };
    })
  );

  return c.json({ debts: debtsWithPaidAmount });
});

// ============================================
// GET /debts/:id - Get single debt with details
// ============================================
debtsRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const debtId = c.req.param("id");
  const db = createDb(c.env.DB);

  const debt = await db.query.debts.findFirst({
    where: and(eq(debts.id, debtId), eq(debts.userId, userId)),
    with: {
      installments: {
        orderBy: (installments, { asc }) => [asc(installments.installmentNumber)],
      },
    },
  });

  if (!debt) {
    return c.json({ error: "Deuda no encontrada" }, 404);
  }

  // Get payment history
  const paymentHistory = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      eq(transactions.debtId, debtId),
      eq(transactions.type, "debt_payment")
    ),
    orderBy: (transactions, { desc }) => [desc(transactions.date)],
  });

  // Calculate totals
  const paidAmount = paymentHistory.reduce((sum, t) => sum + t.amount, 0);
  const remainingAmount = debt.principalAmount - paidAmount;

  return c.json({
    debt: {
      ...debt,
      paidAmount,
      remainingAmount,
      progress: Math.min((paidAmount / debt.principalAmount) * 100, 100),
    },
    paymentHistory,
  });
});

// ============================================
// POST /debts - Create new debt
// ============================================
debtsRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const result = createDebtSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);
  const debtId = generateId();

  await db.insert(debts).values({
    id: debtId,
    userId,
    ...result.data,
  });

  // If totalInstallments is provided, create installment schedule
  if (result.data.totalInstallments && result.data.totalInstallments > 0) {
    const installmentAmount = result.data.principalAmount / result.data.totalInstallments;
    const startDate = new Date(result.data.startDate);

    const installmentInserts = Array.from({ length: result.data.totalInstallments }, (_, i) => {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i + 1);

      return db.insert(debtInstallments).values({
        id: generateId(),
        debtId,
        userId,
        installmentNumber: i + 1,
        amount: installmentAmount,
        dueDate: dueDate.toISOString().split("T")[0],
        status: "pending",
      });
    });

    // @ts-expect-error - Drizzle batch typing issue
    await db.batch(installmentInserts);
  }

  const newDebt = await db.query.debts.findFirst({
    where: eq(debts.id, debtId),
    with: {
      installments: true,
    },
  });

  return c.json({
    message: "Deuda creada exitosamente",
    debt: newDebt,
  }, 201);
});

// ============================================
// PATCH /debts/:id - Update debt
// ============================================
debtsRouter.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const debtId = c.req.param("id");
  const body = await c.req.json();
  const result = updateDebtSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: debts.id })
    .from(debts)
    .where(and(eq(debts.id, debtId), eq(debts.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Deuda no encontrada" }, 404);
  }

  await db
    .update(debts)
    .set({
      ...result.data,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(debts.id, debtId), eq(debts.userId, userId)));

  const updated = await db.query.debts.findFirst({
    where: eq(debts.id, debtId),
    with: {
      installments: true,
    },
  });

  return c.json({
    message: "Deuda actualizada exitosamente",
    debt: updated,
  });
});

// ============================================
// DELETE /debts/:id - Delete debt
// ============================================
debtsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const debtId = c.req.param("id");
  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: debts.id })
    .from(debts)
    .where(and(eq(debts.id, debtId), eq(debts.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Deuda no encontrada" }, 404);
  }

  // Delete installments first (cascade should handle this, but explicit)
  await db
    .delete(debtInstallments)
    .where(and(eq(debtInstallments.debtId, debtId), eq(debtInstallments.userId, userId)));

  await db
    .delete(debts)
    .where(and(eq(debts.id, debtId), eq(debts.userId, userId)));

  return c.json({ message: "Deuda eliminada exitosamente" });
});

// ============================================
// PATCH /debts/:id/installments/:installmentId - Mark installment as paid
// ============================================
debtsRouter.patch("/:id/installments/:installmentId", async (c) => {
  const userId = c.get("userId");
  const debtId = c.req.param("id");
  const installmentId = c.req.param("installmentId");
  const db = createDb(c.env.DB);

  // Verify debt ownership
  const debt = await db
    .select({ id: debts.id })
    .from(debts)
    .where(and(eq(debts.id, debtId), eq(debts.userId, userId)))
    .get();

  if (!debt) {
    return c.json({ error: "Deuda no encontrada" }, 404);
  }

  // Verify installment
  const installment = await db
    .select()
    .from(debtInstallments)
    .where(
      and(
        eq(debtInstallments.id, installmentId),
        eq(debtInstallments.debtId, debtId),
        eq(debtInstallments.userId, userId)
      )
    )
    .get();

  if (!installment) {
    return c.json({ error: "Cuota no encontrada" }, 404);
  }

  const body = await c.req.json();
  const paidDate = body.paidDate || new Date().toISOString().split("T")[0];

  await db
    .update(debtInstallments)
    .set({
      status: "paid",
      paidDate,
    })
    .where(eq(debtInstallments.id, installmentId));

  return c.json({ message: "Cuota marcada como pagada" });
});

export default debtsRouter;
