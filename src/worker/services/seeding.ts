import { Database, accountTypes, categories, merchants } from "../db";

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
// DEFAULT EXPENSE CATEGORIES WITH SUBCATEGORIES
// ============================================
interface CategoryWithSubs {
  name: string;
  icon: string;
  color: string;
  subcategories?: { name: string; icon: string }[];
}

const DEFAULT_EXPENSE_CATEGORIES: CategoryWithSubs[] = [
  { 
    name: "Alimentación", 
    icon: "utensils", 
    color: "#ef4444",
    subcategories: [
      { name: "Supermercado", icon: "shopping-cart" },
      { name: "Delivery", icon: "bike" },
      { name: "Mercado", icon: "apple" },
      { name: "Bodega", icon: "store" },
      { name: "Snacks", icon: "cookie" },
    ]
  },
  { 
    name: "Transporte", 
    icon: "car", 
    color: "#f97316",
    subcategories: [
      { name: "Combustible", icon: "fuel" },
      { name: "Taxi/Uber", icon: "car-taxi-front" },
      { name: "Transporte Público", icon: "bus" },
      { name: "Estacionamiento", icon: "parking-circle" },
      { name: "Mantenimiento", icon: "wrench" },
    ]
  },
  { 
    name: "Vivienda", 
    icon: "home", 
    color: "#eab308",
    subcategories: [
      { name: "Alquiler", icon: "key" },
      { name: "Hipoteca", icon: "landmark" },
      { name: "Mantenimiento", icon: "hammer" },
      { name: "Muebles", icon: "sofa" },
    ]
  },
  { 
    name: "Servicios", 
    icon: "zap", 
    color: "#22c55e",
    subcategories: [
      { name: "Electricidad", icon: "zap" },
      { name: "Agua", icon: "droplet" },
      { name: "Gas", icon: "flame" },
      { name: "Internet", icon: "wifi" },
      { name: "Teléfono", icon: "phone" },
    ]
  },
  { 
    name: "Salud", 
    icon: "heart-pulse", 
    color: "#06b6d4",
    subcategories: [
      { name: "Médico", icon: "stethoscope" },
      { name: "Farmacia", icon: "pill" },
      { name: "Gimnasio", icon: "dumbbell" },
      { name: "Seguro Médico", icon: "shield-check" },
    ]
  },
  { 
    name: "Entretenimiento", 
    icon: "gamepad-2", 
    color: "#8b5cf6",
    subcategories: [
      { name: "Streaming", icon: "tv" },
      { name: "Cine", icon: "clapperboard" },
      { name: "Juegos", icon: "gamepad" },
      { name: "Conciertos", icon: "music" },
      { name: "Deportes", icon: "trophy" },
    ]
  },
  { name: "Educación", icon: "graduation-cap", color: "#3b82f6" },
  { name: "Ropa", icon: "shirt", color: "#ec4899" },
  { name: "Tecnología", icon: "laptop", color: "#6366f1" },
  { 
    name: "Restaurantes", 
    icon: "chef-hat", 
    color: "#f43f5e",
    subcategories: [
      { name: "Fast Food", icon: "sandwich" },
      { name: "Cafetería", icon: "coffee" },
      { name: "Restaurante Formal", icon: "utensils-crossed" },
      { name: "Bar", icon: "beer" },
    ]
  },
  { 
    name: "Suscripciones", 
    icon: "repeat", 
    color: "#14b8a6",
    subcategories: [
      { name: "Apps", icon: "smartphone" },
      { name: "Software", icon: "code" },
      { name: "Membresías", icon: "badge" },
    ]
  },
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
// DEFAULT MERCHANTS (Popular establishments)
// ============================================
const DEFAULT_MERCHANTS = [
  // Fast Food
  { name: "McDonald's", icon: "🍔" },
  { name: "Burger King", icon: "🍔" },
  { name: "KFC", icon: "🍗" },
  { name: "Pizza Hut", icon: "🍕" },
  { name: "Domino's", icon: "🍕" },
  { name: "Subway", icon: "🥪" },
  { name: "Starbucks", icon: "☕" },
  // Supermarkets
  { name: "Wong", icon: "🛒" },
  { name: "Metro", icon: "🛒" },
  { name: "Plaza Vea", icon: "🛒" },
  { name: "Tottus", icon: "🛒" },
  { name: "Vivanda", icon: "🛒" },
  // Delivery Apps
  { name: "Rappi", icon: "📱" },
  { name: "PedidosYa", icon: "📱" },
  { name: "Uber Eats", icon: "🚗" },
  // Transport
  { name: "Uber", icon: "🚕" },
  { name: "Didi", icon: "🚕" },
  { name: "InDrive", icon: "🚕" },
  // Tech & Streaming
  { name: "Netflix", icon: "🎬" },
  { name: "Spotify", icon: "🎵" },
  { name: "Amazon", icon: "📦" },
  { name: "Apple", icon: "🍎" },
  { name: "Google", icon: "🔍" },
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

  // Create default expense categories with subcategories
  const expenseCategoryInserts: any[] = [];
  const subcategoryInserts: { parentId: string; sub: { name: string; icon: string }; color: string }[] = [];
  
  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    const parentId = crypto.randomUUID();
    expenseCategoryInserts.push(
      db.insert(categories).values({
        id: parentId,
        userId,
        name: cat.name,
        type: "expense",
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
      })
    );
    
    // Queue subcategories for later insertion (need parent ID first)
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        subcategoryInserts.push({ parentId, sub, color: cat.color });
      }
    }
  }

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

  // Create subcategory inserts
  const subCategoryDbInserts = subcategoryInserts.map(({ parentId, sub, color }) =>
    db.insert(categories).values({
      id: crypto.randomUUID(),
      userId,
      parentId,
      name: sub.name,
      type: "expense",
      icon: sub.icon,
      color,
      isDefault: true,
    })
  );

  // Create default merchants
  const merchantInserts = DEFAULT_MERCHANTS.map((merchant) =>
    db.insert(merchants).values({
      id: crypto.randomUUID(),
      userId,
      name: merchant.name,
      icon: merchant.icon,
      isDefault: true,
    })
  );

  // Execute all inserts using D1 batch for better performance
  // @ts-expect-error - Drizzle batch typing issue
  await db.batch([
    ...accountTypeInserts,
    ...expenseCategoryInserts,
    ...incomeCategoryInserts,
    ...subCategoryDbInserts,
    ...merchantInserts,
  ]);
}
