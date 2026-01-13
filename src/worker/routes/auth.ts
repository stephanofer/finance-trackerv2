import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { eq } from "drizzle-orm";
import { createDb, users } from "../db";
import { registerSchema, loginSchema } from "../lib/validators";
import { hashPassword, verifyPassword, generateId } from "../lib/crypto";
import { initializeUserDefaults } from "../services/seeding";
import { authMiddleware, getJwtSecret, type AuthVariables } from "../middlewares/auth";

const auth = new Hono<{ 
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "Strict" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 90, // 90 days
};

// ============================================
// POST /auth/register
// ============================================
auth.post("/register", async (c) => {
  const body = await c.req.json();
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    return c.json({ 
      error: "Datos inválidos", 
      details: result.error.flatten().fieldErrors 
    }, 400);
  }

  const { email, password, name, currency } = result.data;
  const db = createDb(c.env.DB);

  // Check if user already exists
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();

  if (existingUser) {
    return c.json({ error: "El email ya está registrado" }, 409);
  }

  // Create new user
  const userId = generateId();
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
    name,
    currency,
  });

  // Seed default data for the new user
  await initializeUserDefaults(db, userId);

  // Generate JWT token
  const jwtSecret = await getJwtSecret(c.env);
  const token = await sign(
    {
      sub: userId,
      email: email.toLowerCase(),
      exp: Math.floor(Date.now() / 1000) + COOKIE_OPTIONS.maxAge,
    },
    jwtSecret
  );

  // Set auth cookie
  setCookie(c, "auth_token", token, COOKIE_OPTIONS);

  return c.json({
    message: "Usuario registrado exitosamente",
    user: {
      id: userId,
      email: email.toLowerCase(),
      name,
      currency,
    },
  }, 201);
});

// ============================================
// POST /auth/login
// ============================================
auth.post("/login", async (c) => {
  const body = await c.req.json();
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return c.json({ 
      error: "Datos inválidos", 
      details: result.error.flatten().fieldErrors 
    }, 400);
  }

  const { email, password } = result.data;
  const db = createDb(c.env.DB);

  // Find user
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();

  if (!user) {
    return c.json({ error: "Credenciales inválidas" }, 401);
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return c.json({ error: "Credenciales inválidas" }, 401);
  }

  // Generate JWT token
  const jwtSecret = await getJwtSecret(c.env);
  const token = await sign(
    {
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + COOKIE_OPTIONS.maxAge,
    },
    jwtSecret
  );

  // Set auth cookie
  setCookie(c, "auth_token", token, COOKIE_OPTIONS);

  return c.json({
    message: "Inicio de sesión exitoso",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      currency: user.currency,
    },
  });
});

// ============================================
// POST /auth/logout
// ============================================
auth.post("/logout", (c) => {
  deleteCookie(c, "auth_token", { path: "/" });
  return c.json({ message: "Sesión cerrada exitosamente" });
});

// ============================================
// GET /auth/me (Protected)
// ============================================
auth.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const user = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      currency: users.currency,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) {
    return c.json({ error: "Usuario no encontrado" }, 404);
  }

  return c.json({ user });
});

// ============================================
// PATCH /auth/me (Update Profile - Protected)
// ============================================
auth.patch("/me", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const db = createDb(c.env.DB);

  const { name, currency } = body;

  const updateData: Partial<{ name: string; currency: string }> = {};
  if (name) updateData.name = name;
  if (currency) updateData.currency = currency;

  if (Object.keys(updateData).length === 0) {
    return c.json({ error: "No hay datos para actualizar" }, 400);
  }

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));

  const updatedUser = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      currency: users.currency,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  return c.json({ 
    message: "Perfil actualizado exitosamente",
    user: updatedUser 
  });
});

// ============================================
// POST /auth/avatar (Upload Avatar - Protected)
// ============================================
auth.post("/avatar", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  // Get form data with the image
  const formData = await c.req.formData();
  const file = formData.get("avatar") as File | null;

  if (!file) {
    return c.json({ error: "No se proporcionó imagen" }, 400);
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ 
      error: "Tipo de archivo no permitido. Usa JPEG, PNG, WebP o GIF" 
    }, 400);
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return c.json({ error: "El archivo es muy grande. Máximo 5MB" }, 400);
  }

  // Generate unique filename
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `avatars/${userId}/${Date.now()}.${ext}`;

  try {
    // Delete old avatar if exists
    const existingUser = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (existingUser?.avatarUrl) {
      // Extract key from URL and delete from R2
      const oldKey = existingUser.avatarUrl.split("/").slice(-3).join("/");
      await c.env.BUCKET.delete(oldKey);
    }

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.BUCKET.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000", // 1 year cache
      },
    });

    // Generate public URL (assumes R2 public access or custom domain)
    // For now, we'll use a relative path that the API can serve
    const avatarUrl = `/api/files/${filename}`;

    // Update user record
    await db
      .update(users)
      .set({ 
        avatarUrl, 
        updatedAt: new Date().toISOString() 
      })
      .where(eq(users.id, userId));

    return c.json({
      message: "Avatar actualizado exitosamente",
      avatarUrl,
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return c.json({ error: "Error al subir la imagen" }, 500);
  }
});

// ============================================
// DELETE /auth/avatar (Remove Avatar - Protected)
// ============================================
auth.delete("/avatar", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  try {
    // Get current avatar
    const user = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (user?.avatarUrl) {
      // Delete from R2
      const key = user.avatarUrl.replace("/api/files/", "");
      await c.env.BUCKET.delete(key);
    }

    // Remove from database
    await db
      .update(users)
      .set({ 
        avatarUrl: null, 
        updatedAt: new Date().toISOString() 
      })
      .where(eq(users.id, userId));

    return c.json({ message: "Avatar eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting avatar:", error);
    return c.json({ error: "Error al eliminar la imagen" }, 500);
  }
});

export default auth;
