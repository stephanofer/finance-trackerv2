import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createDb, transfers, accounts } from "../db";
import { createTransferSchema } from "../lib/validators";
import { generateId } from "../lib/crypto";
import { authMiddleware, type AuthVariables } from "../middlewares/auth";

const transfersRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Apply auth middleware to all routes
transfersRouter.use("*", authMiddleware);

// ============================================
// GET /transfers - List all transfers
// ============================================
transfersRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const transfersList = await db.query.transfers.findMany({
    where: eq(transfers.userId, userId),
    with: {
      fromAccount: {
        columns: { id: true, name: true, color: true },
      },
      toAccount: {
        columns: { id: true, name: true, color: true },
      },
    },
    orderBy: (transfers, { desc }) => [desc(transfers.date), desc(transfers.createdAt)],
  });

  return c.json({ transfers: transfersList });
});

// ============================================
// GET /transfers/:id - Get single transfer
// ============================================
transfersRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const transferId = c.req.param("id");
  const db = createDb(c.env.DB);

  const transfer = await db.query.transfers.findFirst({
    where: and(eq(transfers.id, transferId), eq(transfers.userId, userId)),
    with: {
      fromAccount: true,
      toAccount: true,
    },
  });

  if (!transfer) {
    return c.json({ error: "Transferencia no encontrada" }, 404);
  }

  return c.json({ transfer });
});

// ============================================
// POST /transfers - Create new transfer
// ============================================
transfersRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const result = createTransferSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);
  const { fromAccountId, toAccountId, ...transferData } = result.data;

  // Verify both accounts belong to user
  const fromAccount = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, fromAccountId), eq(accounts.userId, userId)))
    .get();

  if (!fromAccount) {
    return c.json({ error: "Cuenta de origen no encontrada" }, 404);
  }

  const toAccount = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, toAccountId), eq(accounts.userId, userId)))
    .get();

  if (!toAccount) {
    return c.json({ error: "Cuenta de destino no encontrada" }, 404);
  }

  const transferId = generateId();

  await db.insert(transfers).values({
    id: transferId,
    userId,
    fromAccountId,
    toAccountId,
    ...transferData,
  });

  const newTransfer = await db.query.transfers.findFirst({
    where: eq(transfers.id, transferId),
    with: {
      fromAccount: {
        columns: { id: true, name: true, color: true },
      },
      toAccount: {
        columns: { id: true, name: true, color: true },
      },
    },
  });

  return c.json({
    message: "Transferencia creada exitosamente",
    transfer: newTransfer,
  }, 201);
});

// ============================================
// DELETE /transfers/:id - Delete transfer
// ============================================
transfersRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const transferId = c.req.param("id");
  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: transfers.id })
    .from(transfers)
    .where(and(eq(transfers.id, transferId), eq(transfers.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Transferencia no encontrada" }, 404);
  }

  await db
    .delete(transfers)
    .where(and(eq(transfers.id, transferId), eq(transfers.userId, userId)));

  return c.json({ message: "Transferencia eliminada exitosamente" });
});

export default transfersRouter;
