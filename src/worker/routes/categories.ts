import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { createDb, categories } from "../db";
import { createCategorySchema, updateCategorySchema } from "../lib/validators";
import { generateId } from "../lib/crypto";
import { authMiddleware, type AuthVariables } from "../middlewares/auth";

const categoriesRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Apply auth middleware to all routes
categoriesRouter.use("*", authMiddleware);

// ============================================
// GET /categories - List all categories
// ============================================
categoriesRouter.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const type = c.req.query("type") as "income" | "expense" | undefined;
  const includeInactive = c.req.query("includeInactive") === "true";
  const flat = c.req.query("flat") === "true";

  // Build query conditions
  const conditions = [eq(categories.userId, userId)];
  if (type) conditions.push(eq(categories.type, type));
  if (!includeInactive) conditions.push(eq(categories.isActive, true));

  if (flat) {
    // Return flat list of all categories
    const allCategories = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(categories.name);

    return c.json({ categories: allCategories });
  }

  // Return hierarchical structure - only parent categories with their subcategories
  const parentCategories = await db.query.categories.findMany({
    where: and(...conditions, isNull(categories.parentId)),
    with: {
      subcategories: {
        where: includeInactive ? undefined : eq(categories.isActive, true),
      },
    },
    orderBy: (categories, { asc }) => [asc(categories.name)],
  });

  return c.json({ categories: parentCategories });
});

// ============================================
// GET /categories/:id - Get single category
// ============================================
categoriesRouter.get("/:id", async (c) => {
  const userId = c.get("userId");
  const categoryId = c.req.param("id");
  const db = createDb(c.env.DB);

  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.userId, userId)),
    with: {
      subcategories: true,
      parent: true,
    },
  });

  if (!category) {
    return c.json({ error: "Categoría no encontrada" }, 404);
  }

  return c.json({ category });
});

// ============================================
// POST /categories - Create new category
// ============================================
categoriesRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const result = createCategorySchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);
  const { parentId, ...categoryData } = result.data;

  // If parentId is provided, verify it exists and belongs to user
  if (parentId) {
    const parentCategory = await db
      .select({ id: categories.id, type: categories.type })
      .from(categories)
      .where(and(eq(categories.id, parentId), eq(categories.userId, userId)))
      .get();

    if (!parentCategory) {
      return c.json({ error: "Categoría padre no encontrada" }, 404);
    }

    // Subcategory must have same type as parent
    if (parentCategory.type !== categoryData.type) {
      return c.json({ 
        error: "La subcategoría debe ser del mismo tipo que la categoría padre" 
      }, 400);
    }
  }

  const categoryId = generateId();

  await db.insert(categories).values({
    id: categoryId,
    userId,
    parentId: parentId || null,
    ...categoryData,
    isDefault: false,
  });

  const newCategory = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
    with: {
      parent: true,
    },
  });

  return c.json({
    message: "Categoría creada exitosamente",
    category: newCategory,
  }, 201);
});

// ============================================
// PATCH /categories/:id - Update category
// ============================================
categoriesRouter.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const categoryId = c.req.param("id");
  const body = await c.req.json();
  const result = updateCategorySchema.safeParse(body);

  if (!result.success) {
    return c.json({
      error: "Datos inválidos",
      details: result.error.flatten().fieldErrors,
    }, 400);
  }

  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Categoría no encontrada" }, 404);
  }

  await db
    .update(categories)
    .set(result.data)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));

  const updated = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
    with: {
      parent: true,
      subcategories: true,
    },
  });

  return c.json({
    message: "Categoría actualizada exitosamente",
    category: updated,
  });
});

// ============================================
// DELETE /categories/:id - Soft delete category
// ============================================
categoriesRouter.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const categoryId = c.req.param("id");
  const db = createDb(c.env.DB);

  // Verify ownership
  const existing = await db
    .select({ id: categories.id, isDefault: categories.isDefault })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .get();

  if (!existing) {
    return c.json({ error: "Categoría no encontrada" }, 404);
  }

  // Prevent deletion of default categories
  if (existing.isDefault) {
    return c.json({ error: "No se pueden eliminar categorías por defecto" }, 400);
  }

  // Soft delete - also deactivate subcategories
  await db
    .update(categories)
    .set({ isActive: false })
    .where(and(eq(categories.parentId, categoryId), eq(categories.userId, userId)));

  await db
    .update(categories)
    .set({ isActive: false })
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));

  return c.json({ message: "Categoría eliminada exitosamente" });
});

export default categoriesRouter;
