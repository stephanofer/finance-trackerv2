import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

// Routes
import health from "./routes/health";
import auth from "./routes/auth";
import accountsRouter from "./routes/accounts";
import accountTypesRouter from "./routes/account-types";
import categoriesRouter from "./routes/categories";
import transactionsRouter from "./routes/transactions";
import transfersRouter from "./routes/transfers";
import debtsRouter from "./routes/debts";
import loansRouter from "./routes/loans";
import goalsRouter from "./routes/goals";
import attachmentsRouter from "./routes/attachments";
import settingsRouter from "./routes/settings";
import scheduledPaymentsRouter from "./routes/scheduled-payments";
import dashboardRouter from "./routes/dashboard";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

// Global Middlewares
app.use("*", logger());
app.use("*", prettyJSON());
app.use("*", cors({
  origin: (origin) => origin, // Allow all origins in development
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Health check (public)
app.route("/health", health);

// Auth routes (public)
app.route("/auth", auth);

// Protected routes
app.route("/accounts", accountsRouter);
app.route("/account-types", accountTypesRouter);
app.route("/categories", categoriesRouter);
app.route("/transactions", transactionsRouter);
app.route("/transfers", transfersRouter);
app.route("/debts", debtsRouter);
app.route("/loans", loansRouter);
app.route("/goals", goalsRouter);
app.route("/attachments", attachmentsRouter);
app.route("/settings", settingsRouter);
app.route("/scheduled-payments", scheduledPaymentsRouter);
app.route("/dashboard", dashboardRouter);

// ============================================
// FILES ROUTE (Serve R2 files)
// ============================================
app.get("/files/*", async (c) => {
  const key = c.req.path.replace("/api/files/", "");
  
  if (!key) {
    return c.json({ error: "Archivo no especificado" }, 400);
  }

  try {
    const object = await c.env.BUCKET.get(key);
    
    if (!object) {
      return c.json({ error: "Archivo no encontrado" }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000");

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Error serving file:", error);
    return c.json({ error: "Error al obtener el archivo" }, 500);
  }
});

// Global error handler
app.onError((err, c) => {
  console.error(`[Error] ${err.message}`, err.stack);
  return c.json({
    error: "Error interno del servidor",
    message: err.message,
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Ruta no encontrada" }, 404);
});

export default app;
