import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { userSettings } from "../db/schema";
import { updateUserSettingsSchema, dashboardConfigSchema } from "../lib/validators";
import { authMiddleware, type AuthVariables } from "../middlewares/auth";

const settingsRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Apply auth middleware to all routes
settingsRouter.use("*", authMiddleware);

// ============================================
// GET USER SETTINGS
// ============================================
settingsRouter.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");

  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  // Si no existen settings, crear con valores por defecto
  if (!settings) {
    const defaultSettings = {
      id: crypto.randomUUID(),
      userId,
      theme: "system" as const,
      language: "es",
      dateFormat: "DD/MM/YYYY",
      numberFormat: "es-PE",
      dashboardConfig: {
        expensesPeriod: "month",
        incomePeriod: "month",
        recentTransactionsLimit: 5,
        balanceAccountIds: null,
        featuredGoalId: null,
        dashboardGoalIds: null,
        showScheduledPayments: true,
        scheduledPaymentsDays: 7,
        widgetsOrder: ["balance", "expenses", "income", "transactions", "goals", "scheduled_payments"],
        categoryBreakdownPeriod: "month",
        categoryBreakdownType: "expense",
      },
      notifyOnDuePayments: true,
      notifyOnGoalProgress: true,
      notifyOnRecurring: false,
      showCentsInAmounts: true,
      defaultAccountId: null,
      startOfWeek: 1, // Monday
      fiscalMonthStart: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(userSettings).values({
      ...defaultSettings,
      dashboardConfig: JSON.stringify(defaultSettings.dashboardConfig),
    });

    return c.json({ data: defaultSettings });
  }

  // Parse dashboardConfig JSON
  const parsedSettings = {
    ...settings,
    dashboardConfig: settings.dashboardConfig
      ? JSON.parse(settings.dashboardConfig)
      : null,
  };

  return c.json({ data: parsedSettings });
});

// ============================================
// UPDATE USER SETTINGS
// ============================================
settingsRouter.patch("/", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = updateUserSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten().fieldErrors }, 400);
  }

  // Verificar si existen settings
  const [existing] = await db
    .select({ id: userSettings.id })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };

  // Stringify dashboardConfig if present
  if (parsed.data.dashboardConfig) {
    updateData.dashboardConfig = JSON.stringify(parsed.data.dashboardConfig);
  }

  if (!existing) {
    // Crear nuevos settings
    const newSettings = {
      id: crypto.randomUUID(),
      userId,
      theme: "system" as const,
      language: "es",
      dateFormat: "DD/MM/YYYY",
      numberFormat: "es-PE",
      notifyOnDuePayments: true,
      notifyOnGoalProgress: true,
      notifyOnRecurring: false,
      showCentsInAmounts: true,
      startOfWeek: 1,
      fiscalMonthStart: 1,
      createdAt: new Date().toISOString(),
      ...updateData,
    };

    await db.insert(userSettings).values(newSettings);
    
    return c.json({ 
      data: {
        ...newSettings,
        dashboardConfig: parsed.data.dashboardConfig || null,
      }
    });
  }

  // Update existing
  await db
    .update(userSettings)
    .set(updateData)
    .where(eq(userSettings.userId, userId));

  const [updated] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return c.json({
    data: {
      ...updated,
      dashboardConfig: updated.dashboardConfig
        ? JSON.parse(updated.dashboardConfig)
        : null,
    },
  });
});

// ============================================
// UPDATE DASHBOARD CONFIG ONLY
// ============================================
settingsRouter.patch("/dashboard", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");
  const body = await c.req.json();

  const parsed = dashboardConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten().fieldErrors }, 400);
  }

  // Verificar si existen settings
  const [existing] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  const configJson = JSON.stringify(parsed.data);

  if (!existing) {
    // Crear con defaults
    await db.insert(userSettings).values({
      id: crypto.randomUUID(),
      userId,
      theme: "system",
      language: "es",
      dateFormat: "DD/MM/YYYY",
      numberFormat: "es-PE",
      dashboardConfig: configJson,
      notifyOnDuePayments: true,
      notifyOnGoalProgress: true,
      notifyOnRecurring: false,
      showCentsInAmounts: true,
      startOfWeek: 1,
      fiscalMonthStart: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    await db
      .update(userSettings)
      .set({
        dashboardConfig: configJson,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userSettings.userId, userId));
  }

  return c.json({ data: parsed.data });
});

// ============================================
// RESET SETTINGS TO DEFAULTS
// ============================================
settingsRouter.post("/reset", async (c) => {
  const db = drizzle(c.env.DB);
  const userId = c.get("userId");

  const defaultSettings = {
    theme: "system" as const,
    language: "es",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "es-PE",
    dashboardConfig: JSON.stringify({
      expensesPeriod: "month",
      incomePeriod: "month",
      recentTransactionsLimit: 5,
      balanceAccountIds: null,
      dashboardGoalIds: null,
      showScheduledPayments: true,
      scheduledPaymentsDays: 7,
      widgetsOrder: ["balance", "expenses", "income", "transactions", "goals", "scheduled_payments"],
      categoryBreakdownPeriod: "month",
      categoryBreakdownType: "expense",
    }),
    notifyOnDuePayments: true,
    notifyOnGoalProgress: true,
    notifyOnRecurring: false,
    showCentsInAmounts: true,
    defaultAccountId: null,
    startOfWeek: 1,
    fiscalMonthStart: 1,
    updatedAt: new Date().toISOString(),
  };

  const [existing] = await db
    .select({ id: userSettings.id })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(userSettings)
      .set(defaultSettings)
      .where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({
      id: crypto.randomUUID(),
      userId,
      ...defaultSettings,
      createdAt: new Date().toISOString(),
    });
  }

  return c.json({ 
    message: "Configuración restablecida a valores por defecto",
    data: {
      ...defaultSettings,
      dashboardConfig: JSON.parse(defaultSettings.dashboardConfig),
    }
  });
});

export default settingsRouter;
