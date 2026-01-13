import { Database, accountTypes, categories } from "../db";

// ============================================
// DEFAULT ACCOUNT TYPES
// ============================================
const DEFAULT_ACCOUNT_TYPES = [
  { name: "Efectivo", icon: "banknote" },
  { name: "Débito", icon: "credit-card" },
  { name: "Crédito", icon: "credit-card" },
  { name: "Banco", icon: "building" },
  { name: "Ahorros", icon: "piggy-bank" },
  { name: "Inversión", icon: "trending-up" },
  { name: "Billetera Digital", icon: "wallet" },
];

// ============================================
// DEFAULT EXPENSE CATEGORIES
// ============================================
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Alimentación", icon: "utensils", color: "#ef4444" },
  { name: "Transporte", icon: "car", color: "#f97316" },
  { name: "Vivienda", icon: "home", color: "#eab308" },
  { name: "Servicios", icon: "zap", color: "#22c55e" },
  { name: "Salud", icon: "heart-pulse", color: "#06b6d4" },
  { name: "Entretenimiento", icon: "gamepad-2", color: "#8b5cf6" },
  { name: "Educación", icon: "graduation-cap", color: "#3b82f6" },
  { name: "Ropa", icon: "shirt", color: "#ec4899" },
  { name: "Tecnología", icon: "laptop", color: "#6366f1" },
  { name: "Restaurantes", icon: "chef-hat", color: "#f43f5e" },
  { name: "Suscripciones", icon: "repeat", color: "#14b8a6" },
  { name: "Mascotas", icon: "dog", color: "#a855f7" },
  { name: "Regalos", icon: "gift", color: "#e11d48" },
  { name: "Viajes", icon: "plane", color: "#0ea5e9" },
  { name: "Otros Gastos", icon: "more-horizontal", color: "#71717a" },
];

// ============================================
// DEFAULT INCOME CATEGORIES
// ============================================
const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salario", icon: "briefcase", color: "#22c55e" },
  { name: "Freelance", icon: "laptop", color: "#10b981" },
  { name: "Inversiones", icon: "trending-up", color: "#059669" },
  { name: "Negocio", icon: "store", color: "#047857" },
  { name: "Bonos", icon: "gift", color: "#15803d" },
  { name: "Reembolsos", icon: "rotate-ccw", color: "#166534" },
  { name: "Ventas", icon: "shopping-bag", color: "#14532d" },
  { name: "Alquiler", icon: "home", color: "#065f46" },
  { name: "Intereses", icon: "percent", color: "#0d9488" },
  { name: "Otros Ingresos", icon: "more-horizontal", color: "#71717a" },
];

// ============================================
// SEED USER DEFAULTS
// ============================================
export async function initializeUserDefaults(db: Database, userId: string): Promise<void> {
  // Create default account types
  const accountTypeInserts = DEFAULT_ACCOUNT_TYPES.map((type) => 
    db.insert(accountTypes).values({
      id: crypto.randomUUID(),
      userId,
      name: type.name,
      icon: type.icon,
      isDefault: true,
    })
  );

  // Create default expense categories
  const expenseCategoryInserts = DEFAULT_EXPENSE_CATEGORIES.map((cat) =>
    db.insert(categories).values({
      id: crypto.randomUUID(),
      userId,
      name: cat.name,
      type: "expense",
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
    })
  );

  // Create default income categories
  const incomeCategoryInserts = DEFAULT_INCOME_CATEGORIES.map((cat) =>
    db.insert(categories).values({
      id: crypto.randomUUID(),
      userId,
      name: cat.name,
      type: "income",
      icon: cat.icon,
      color: cat.color,
      isDefault: true,
    })
  );

  // Execute all inserts using D1 batch for better performance
  // @ts-expect-error - Drizzle batch typing issue
  await db.batch([
    ...accountTypeInserts,
    ...expenseCategoryInserts,
    ...incomeCategoryInserts,
  ]);
}
