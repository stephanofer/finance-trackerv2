import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { createDb, goals, transactions } from "../db";
import { createGoalSchema, updateGoalSchema } from "../lib/validators";
import { generateId } from "../lib/crypto";
import { authMiddleware, type AuthVariables } from "../middlewares/auth";

const goalsRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Apply auth middleware to all routes
goalsRouter.use("*", authMiddleware);

// ============================================
// GET /goals - List all goals
// ============================================
goalsRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const includeCompleted = c.req.query("includeCompleted") === "true";

  const conditions = [eq(goals.userId, userId)];
  if (!includeCompleted) conditions.push(eq(goals.isCompleted, false));

  const goalsList = await db
    .select()
    .from(goals)
    .where(and(...conditions))
    .orderBy(goals.createdAt);

  // Calculate current amount for each goal
  const goalsWithProgress = await Promise.all(
    goalsList.map(async (goal) => {
      const [contributedResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.goalId, goal.id),
            eq(transactions.type, "goal_contribution")
          )
        );

      const currentAmount = contributedResult?.total || 0;
      const remainingAmount = goal.targetAmount - currentAmount;
      const progress = (currentAmount / goal.targetAmount) * 100;

      // Calculate estimated monthly contribution to reach goal
      let suggestedMonthlyAmount = null;
      if (goal.targetDate && !goal.isCompleted) {
        const today = new Date();
        const targetDate = new Date(goal.targetDate);
        const monthsRemaining = Math.max(
          1,
          (targetDate.getFullYear() - today.getFullYear()) * 12 +
            (targetDate.getMonth() - today.getMonth())
        );
        suggestedMonthlyAmount = remainingAmount / monthsRemaining;
      }

      return {
        ...goal,
        currentAmount,
        remainingAmount: Math.max(0, remainingAmount),
        progress: Math.min(progress, 100),
        suggestedMonthlyAmount,
      };
    })
  );

  return c.json({ goals: goalsWithProgress });
});

// ============================================
// GET /goals/:id - Get single goal with details
// ============================================
goalsRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const goalId = c.req.param("id");
  const db = createDb(c.env.DB);

  const goal = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .get();

  if (!goal) {
    return c.json({ error: "Meta no encontrada" }, 404);
  }

  // Get contribution history
  const contributionHistory = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      eq(transactions.goalId, goalId),
      eq(transactions.type, "goal_contribution")
    ),
    with: {
      account: {
        columns: { id: true, name: true },
      },
    },
    orderBy: (transactions, { desc }) => [desc(transactions.date)],
  });

  // Calculate totals
  const currentAmount = contributionHistory.reduce((sum, t) => sum + t.amount, 0);
  const remainingAmount = goal.targetAmount - currentAmount;

  return c.json({
    goal: {
      ...goal,
      currentAmount,
      remainingAmount: Math.max(0, remainingAmount),
      progress: Math.min((currentAmount / goal.targetAmount) * 100, 100),
    },
    contributionHistory,
  });
});

// ============================================
// POST /goals - Create new goal
// ============================================
goalsRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const result = createGoalSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);
  const goalId = generateId();

  await db.insert(goals).values({
    id: goalId,
    userId,
    ...result.data,
  });

  const newGoal = await db
    .select()
    .from(goals)
    .where(eq(goals.id, goalId))
    .get();

  return c.json({
    message: "Meta creada exitosamente",
    goal: {
      ...newGoal,
      currentAmount: 0,
      remainingAmount: result.data.targetAmount,
      progress: 0,
    },
  }, 201);
});

// ============================================
// PATCH /goals/:id - Update goal
// ============================================
goalsRouter.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const goalId = c.req.param("id");
  const body = await c.req.json();
  const result = updateGoalSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Meta no encontrada" }, 404);
  }

  await db
    .update(goals)
    .set({
      ...result.data,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));

  const updated = await db
    .select()
    .from(goals)
    .where(eq(goals.id, goalId))
    .get();

  return c.json({
    message: "Meta actualizada exitosamente",
    goal: updated,
  });
});

// ============================================
// DELETE /goals/:id - Delete goal
// ============================================
goalsRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const goalId = c.req.param("id");
  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Meta no encontrada" }, 404);
  }

  await db
    .delete(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));

  return c.json({ message: "Meta eliminada exitosamente" });
});

// ============================================
// POST /goals/:id/complete - Mark goal as completed
// ============================================
goalsRouter.post("/:id/complete", async (c) => {
  const userId = c.get("userId");
  const goalId = c.req.param("id");
  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Meta no encontrada" }, 404);
  }

  await db
    .update(goals)
    .set({
      isCompleted: true,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));

  return c.json({ message: "¡Felicidades! Meta completada exitosamente" });
});

export default goalsRouter;
