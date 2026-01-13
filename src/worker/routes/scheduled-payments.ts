import { Hono } from "hono";
import { eq, and, gte, lte, desc, asc, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { 
  scheduledPayments, 
  categories, 
  accounts, 
  debts, 
  loans,
  transactions 
} from "../db/schema";
import {
  createScheduledPaymentSchema,
  updateScheduledPaymentSchema,
  markPaymentAsPaidSchema,
  scheduledPaymentFiltersSchema,
} from "../lib/validators";
import { authMiddleware, type AuthVariables } from "../middlewares/auth";

const scheduledPaymentsRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Apply auth middleware to all routes
scheduledPaymentsRouter.use("*", authMiddleware);

// ============================================
// HELPER: Get next due date based on frequency
// ============================================
function getNextDueDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().split("T")[0];
}

// ============================================
// HELPER: Update overdue payments
// ============================================
async function markOverduePayments(db: ReturnType<typeof drizzle>, userId: string) {
  const today = new Date().toISOString().split("T")[0];
  
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
}

// ============================================
// LIST SCHEDULED PAYMENTS
// ============================================
scheduledPaymentsRouter.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const query = c.req.query();

  // Mark overdue payments first
  await markOverduePayments(db, userId);

  const parsed = scheduledPaymentFiltersSchema.safeParse(query);
  
  const conditions = [eq(scheduledPayments.userId, userId)];

  if (parsed.success) {
    const filters = parsed.data;
    
    // Apply filters
    if (filters.status) {
      conditions.push(eq(scheduledPayments.status, filters.status));
    }
    
    if (filters.priority) {
      conditions.push(eq(scheduledPayments.priority, filters.priority));
    }
    
    if (filters.startDate) {
      conditions.push(gte(scheduledPayments.dueDate, filters.startDate));
    }
    
    if (filters.endDate) {
      conditions.push(lte(scheduledPayments.dueDate, filters.endDate));
    }

    // Exclude overdue by default if not requested
    if (!filters.includeOverdue && !filters.status) {
      conditions.push(
        or(
          eq(scheduledPayments.status, "pending"),
          eq(scheduledPayments.status, "paid")
        )!
      );
    }
  }

  const payments = await db
    .select({
      payment: scheduledPayments,
      category: categories,
      account: accounts,
    })
    .from(scheduledPayments)
    .leftJoin(categories, eq(scheduledPayments.categoryId, categories.id))
    .leftJoin(accounts, eq(scheduledPayments.accountId, accounts.id))
    .where(and(...conditions))
    .orderBy(asc(scheduledPayments.dueDate), desc(scheduledPayments.priority));

  const result = payments.map((row) => ({
    ...row.payment,
    category: row.category,
    account: row.account,
  }));

  return c.json({ data: result });
});

// ============================================
// GET UPCOMING PAYMENTS (para dashboard)
// ============================================
scheduledPaymentsRouter.get("/upcoming", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const days = parseInt(c.req.query("days") || "7");

  // Mark overdue payments first
  await markOverduePayments(db, userId);

  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + days);

  const payments = await db
    .select({
      payment: scheduledPayments,
      category: categories,
      account: accounts,
    })
    .from(scheduledPayments)
    .leftJoin(categories, eq(scheduledPayments.categoryId, categories.id))
    .leftJoin(accounts, eq(scheduledPayments.accountId, accounts.id))
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
    .orderBy(asc(scheduledPayments.dueDate), desc(scheduledPayments.priority));

  const result = payments.map((row) => ({
    ...row.payment,
    category: row.category,
    account: row.account,
    isOverdue: row.payment.status === "overdue",
    daysUntilDue: Math.ceil(
      (new Date(row.payment.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  // Resumen
  const summary = {
    total: result.length,
    totalAmount: result.reduce((sum, p) => sum + p.amount, 0),
    overdue: result.filter((p) => p.isOverdue).length,
    overdueAmount: result.filter((p) => p.isOverdue).reduce((sum, p) => sum + p.amount, 0),
    dueToday: result.filter((p) => p.daysUntilDue === 0).length,
    byPriority: {
      urgent: result.filter((p) => p.priority === "urgent").length,
      high: result.filter((p) => p.priority === "high").length,
      medium: result.filter((p) => p.priority === "medium").length,
      low: result.filter((p) => p.priority === "low").length,
    },
  };

  return c.json({ data: result, summary });
});

// ============================================
// GET SINGLE PAYMENT
// ============================================
scheduledPaymentsRouter.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const id = c.req.param("id");

  const [payment] = await db
    .select({
      payment: scheduledPayments,
      category: categories,
      account: accounts,
      debt: debts,
      loan: loans,
    })
    .from(scheduledPayments)
    .leftJoin(categories, eq(scheduledPayments.categoryId, categories.id))
    .leftJoin(accounts, eq(scheduledPayments.accountId, accounts.id))
    .leftJoin(debts, eq(scheduledPayments.debtId, debts.id))
    .leftJoin(loans, eq(scheduledPayments.loanId, loans.id))
    .where(and(eq(scheduledPayments.id, id), eq(scheduledPayments.userId, userId)))
    .limit(1);

  if (!payment) {
    return c.json({ error: "Pago programado no encontrado" }, 404);
  }

  return c.json({
    data: {
      ...payment.payment,
      category: payment.category,
      account: payment.account,
      debt: payment.debt,
      loan: payment.loan,
    },
  });
});

// ============================================
// CREATE SCHEDULED PAYMENT
// ============================================
scheduledPaymentsRouter.post("/", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = createScheduledPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten().fieldErrors }, 400);
  }

  const { categoryId, accountId, debtId, loanId, ...data } = parsed.data;

  // Validar referencias si se proporcionan
  if (categoryId) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
      .limit(1);
    if (!cat) {
      return c.json({ error: "Categoría no encontrada" }, 404);
    }
  }

  if (accountId) {
    const [acc] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!acc) {
      return c.json({ error: "Cuenta no encontrada" }, 404);
    }
  }

  if (debtId) {
    const [debt] = await db
      .select({ id: debts.id })
      .from(debts)
      .where(and(eq(debts.id, debtId), eq(debts.userId, userId)))
      .limit(1);
    if (!debt) {
      return c.json({ error: "Deuda no encontrada" }, 404);
    }
  }

  if (loanId) {
    const [loan] = await db
      .select({ id: loans.id })
      .from(loans)
      .where(and(eq(loans.id, loanId), eq(loans.userId, userId)))
      .limit(1);
    if (!loan) {
      return c.json({ error: "Préstamo no encontrado" }, 404);
    }
  }

  const now = new Date().toISOString();
  const newPayment = {
    id: crypto.randomUUID(),
    userId,
    ...data,
    categoryId: categoryId || null,
    accountId: accountId || null,
    debtId: debtId || null,
    loanId: loanId || null,
    debtInstallmentId: parsed.data.debtInstallmentId || null,
    status: "pending" as const,
    paidDate: null,
    paidAmount: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(scheduledPayments).values(newPayment);

  return c.json({ data: newPayment }, 201);
});

// ============================================
// UPDATE SCHEDULED PAYMENT
// ============================================
scheduledPaymentsRouter.patch("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json();

  const parsed = updateScheduledPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten().fieldErrors }, 400);
  }

  // Verificar que existe y pertenece al usuario
  const [existing] = await db
    .select({ id: scheduledPayments.id })
    .from(scheduledPayments)
    .where(and(eq(scheduledPayments.id, id), eq(scheduledPayments.userId, userId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "Pago programado no encontrado" }, 404);
  }

  await db
    .update(scheduledPayments)
    .set({
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(scheduledPayments.id, id), eq(scheduledPayments.userId, userId)));

  const [updated] = await db
    .select()
    .from(scheduledPayments)
    .where(eq(scheduledPayments.id, id))
    .limit(1);

  return c.json({ data: updated });
});

// ============================================
// MARK AS PAID
// ============================================
scheduledPaymentsRouter.post("/:id/pay", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json();

  const parsed = markPaymentAsPaidSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten().fieldErrors }, 400);
  }

  // Obtener el pago
  const [payment] = await db
    .select()
    .from(scheduledPayments)
    .where(and(eq(scheduledPayments.id, id), eq(scheduledPayments.userId, userId)))
    .limit(1);

  if (!payment) {
    return c.json({ error: "Pago programado no encontrado" }, 404);
  }

  if (payment.status === "paid") {
    return c.json({ error: "Este pago ya fue marcado como pagado" }, 400);
  }

  if (payment.status === "cancelled") {
    return c.json({ error: "No se puede pagar un pago cancelado" }, 400);
  }

  const now = new Date().toISOString();
  const paidDate = parsed.data.paidDate || now.split("T")[0];
  const paidAmount = parsed.data.paidAmount || payment.amount;

  // Marcar como pagado
  await db
    .update(scheduledPayments)
    .set({
      status: "paid",
      paidDate,
      paidAmount,
      updatedAt: now,
    })
    .where(eq(scheduledPayments.id, id));

  // Si es recurrente y se solicita, crear el siguiente pago
  let nextPayment = null;
  if (payment.isRecurring && payment.recurringFrequency && parsed.data.createNextRecurrence !== false) {
    const nextDueDate = getNextDueDate(payment.dueDate, payment.recurringFrequency);
    
    nextPayment = {
      id: crypto.randomUUID(),
      userId,
      name: payment.name,
      description: payment.description,
      amount: payment.amount,
      currency: payment.currency,
      dueDate: nextDueDate,
      status: "pending" as const,
      categoryId: payment.categoryId,
      accountId: payment.accountId,
      debtId: payment.debtId,
      loanId: payment.loanId,
      debtInstallmentId: null,
      isRecurring: true,
      recurringFrequency: payment.recurringFrequency,
      priority: payment.priority,
      tags: payment.tags,
      notes: payment.notes,
      reminderDays: payment.reminderDays,
      paidDate: null,
      paidAmount: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(scheduledPayments).values(nextPayment);
  }

  // Si hay cuenta asignada, crear la transacción automáticamente
  let createdTransaction = null;
  if (payment.accountId) {
    const txId = crypto.randomUUID();
    
    await db.insert(transactions).values({
      id: txId,
      userId,
      accountId: payment.accountId,
      categoryId: payment.categoryId,
      type: "expense",
      amount: paidAmount,
      description: `Pago: ${payment.name}`,
      date: paidDate,
      createdAt: now,
      updatedAt: now,
    });

    // Note: Balance is calculated dynamically from transactions, no need to update

    createdTransaction = { id: txId };
  }

  return c.json({
    message: "Pago registrado exitosamente",
    data: {
      payment: { ...payment, status: "paid", paidDate, paidAmount },
      nextPayment,
      transaction: createdTransaction,
    },
  });
});

// ============================================
// CANCEL PAYMENT
// ============================================
scheduledPaymentsRouter.post("/:id/cancel", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const id = c.req.param("id");

  const [payment] = await db
    .select({ id: scheduledPayments.id, status: scheduledPayments.status })
    .from(scheduledPayments)
    .where(and(eq(scheduledPayments.id, id), eq(scheduledPayments.userId, userId)))
    .limit(1);

  if (!payment) {
    return c.json({ error: "Pago programado no encontrado" }, 404);
  }

  if (payment.status === "paid") {
    return c.json({ error: "No se puede cancelar un pago ya realizado" }, 400);
  }

  await db
    .update(scheduledPayments)
    .set({
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(scheduledPayments.id, id));

  return c.json({ message: "Pago cancelado exitosamente" });
});

// ============================================
// DELETE PAYMENT
// ============================================
scheduledPaymentsRouter.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const id = c.req.param("id");

  // First check if exists
  const [existing] = await db
    .select({ id: scheduledPayments.id })
    .from(scheduledPayments)
    .where(and(eq(scheduledPayments.id, id), eq(scheduledPayments.userId, userId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "Pago programado no encontrado" }, 404);
  }

  await db
    .delete(scheduledPayments)
    .where(and(eq(scheduledPayments.id, id), eq(scheduledPayments.userId, userId)));

  return c.json({ message: "Pago programado eliminado" });
});

// ============================================
// BULK CREATE FROM DEBT INSTALLMENTS
// ============================================
scheduledPaymentsRouter.post("/from-debt/:debtId", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const debtId = c.req.param("debtId");

  // Verificar que la deuda existe
  const [debt] = await db
    .select()
    .from(debts)
    .where(and(eq(debts.id, debtId), eq(debts.userId, userId)))
    .limit(1);

  if (!debt) {
    return c.json({ error: "Deuda no encontrada" }, 404);
  }

  // Calcular cuotas restantes - usar principalAmount y totalInstallments
  const totalInstallments = debt.totalInstallments || 1;
  const monthlyPayment = debt.principalAmount / totalInstallments;
  const paymentsToCreate = [];
  const now = new Date().toISOString();
  
  const startDate = new Date(debt.dueDate || debt.startDate);
  
  for (let i = 0; i < totalInstallments; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    paymentsToCreate.push({
      id: crypto.randomUUID(),
      userId,
      name: `${debt.creditor} - Cuota ${i + 1}/${totalInstallments}`,
      description: `Pago de deuda: ${debt.creditor}`,
      amount: monthlyPayment,
      currency: debt.currency,
      dueDate: dueDate.toISOString().split("T")[0],
      status: "pending" as const,
      debtId: debt.id,
      priority: "high" as const,
      isRecurring: false,
      reminderDays: 3,
      categoryId: null,
      accountId: null,
      loanId: null,
      debtInstallmentId: null,
      recurringFrequency: null,
      tags: null,
      notes: null,
      paidDate: null,
      paidAmount: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Batch insert
  // @ts-expect-error - Drizzle batch type inference issues
  await db.batch(paymentsToCreate.map((p) => db.insert(scheduledPayments).values(p)));

  return c.json({
    message: `Se crearon ${paymentsToCreate.length} pagos programados para la deuda`,
    data: paymentsToCreate,
  }, 201);
});

export default scheduledPaymentsRouter;
