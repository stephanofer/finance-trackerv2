import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { createDb, accountTypes } from "../db";
import { createAccountTypeSchema, updateAccountTypeSchema } from "../lib/validators";
import { generateId } from "../lib/crypto";
import { authMiddleware, type AuthVariables } from "../middlewares/auth";

const accountTypesRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Apply auth middleware to all routes
accountTypesRouter.use("*", authMiddleware);

// ============================================
// GET /account-types - List all account types
// ============================================
accountTypesRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const types = await db
    .select()
    .from(accountTypes)
    .where(eq(accountTypes.userId, userId))
    .orderBy(accountTypes.name);

  return c.json({ accountTypes: types });
});

// ============================================
// GET /account-types/:id - Get single account type
// ============================================
accountTypesRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const typeId = c.req.param("id");
  const db = createDb(c.env.DB);

  const type = await db
    .select()
    .from(accountTypes)
    .where(and(eq(accountTypes.id, typeId), eq(accountTypes.userId, userId)))
    .get();

  if (!type) {
    return c.json({ error: "Tipo de cuenta no encontrado" }, 404);
  }

  return c.json({ accountType: type });
});

// ============================================
// POST /account-types - Create new account type
// ============================================
accountTypesRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const result = createAccountTypeSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);
  const typeId = generateId();

  await db.insert(accountTypes).values({
    id: typeId,
    userId,
    name: result.data.name,
    icon: result.data.icon,
    isDefault: false,
  });

  const newType = await db
    .select()
    .from(accountTypes)
    .where(eq(accountTypes.id, typeId))
    .get();

  return c.json({
    message: "Tipo de cuenta creado exitosamente",
    accountType: newType,
  }, 201);
});

// ============================================
// PATCH /account-types/:id - Update account type
// ============================================
accountTypesRouter.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const typeId = c.req.param("id");
  const body = await c.req.json();
  const result = updateAccountTypeSchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: accountTypes.id })
    .from(accountTypes)
    .where(and(eq(accountTypes.id, typeId), eq(accountTypes.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Tipo de cuenta no encontrado" }, 404);
  }

  await db
    .update(accountTypes)
    .set(result.data)
    .where(and(eq(accountTypes.id, typeId), eq(accountTypes.userId, userId)));

  const updated = await db
    .select()
    .from(accountTypes)
    .where(eq(accountTypes.id, typeId))
    .get();

  return c.json({
    message: "Tipo de cuenta actualizado exitosamente",
    accountType: updated,
  });
});

// ============================================
// DELETE /account-types/:id - Delete account type
// ============================================
accountTypesRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const typeId = c.req.param("id");
  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: accountTypes.id, isDefault: accountTypes.isDefault })
    .from(accountTypes)
    .where(and(eq(accountTypes.id, typeId), eq(accountTypes.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Tipo de cuenta no encontrado" }, 404);
  }

  // Prevent deletion of default types
  if (existing.isDefault) {
    return c.json({ error: "No se pueden eliminar tipos de cuenta por defecto" }, 400);
  }

  await db
    .delete(accountTypes)
    .where(and(eq(accountTypes.id, typeId), eq(accountTypes.userId, userId)));

  return c.json({ message: "Tipo de cuenta eliminado exitosamente" });
});

export default accountTypesRouter;
