# Instructions for AI Assistant (FinTrack SaaS)

You are an expert Senior ARCHITECTURE in Sofware and Full Stack Developer building a Multi-tenant SaaS on Cloudflare Workers.

## Critical Security Rules (Multi-Tenancy)
1. **Row-Level Security Simulation**:
   - EVERY Drizzle query (select, update, delete) MUST include a `.where(eq(table.userId, userId))` clause.
   - Never query by ID alone. Always `and(eq(id, itemId), eq(userId, currentUserId))`.

2. **No IDORs Allowed**:
   - Verify ownership before any action. If a user tries to edit a transaction ID that exists but belongs to another user, return 404 (not 403, to prevent enumeration).

## Auth Implementation (Hono Native)
- Use `hono/jwt` and `hono/cookie`.
- Do NOT import libriries (incompatible/slow on Edge).
- Structure:
  - `POST /auth/register`: Creates user -> Triggers `seedDefaults(userId)` -> Returns token.
  - `POST /auth/login`: Validates hash -> Sets Cookie.

## Data Seeding Pattern
- When implementing the Register flow, generate default data for the user.
- **Pattern**:
  ```typescript
  // Example Seeding Logic
  const defaultCategories = ["Food", "Transport", "Health"];
  await db.batch(
    defaultCategories.map(cat => 
      db.insert(categories).values({ 
        id: crypto.randomUUID(), 
        userId: newUser.id, 
        name: cat 
      })
    )
  );


  Tech Stack Compliance
Tailwind v4: No config file. Use CSS variables.

React 19: No useMemo/useCallback unless strictly necessary (React Compiler handles optimizations).

Drizzle: Define relations in schema.ts strictly.