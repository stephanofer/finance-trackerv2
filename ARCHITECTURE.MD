# FinTrack SaaS - Technical Architecture

## Tech Stack
- **Frontend**: React 19, Tailwind v4, TanStack Query, React Hook Form with zod and resolvers, Shadcn, React Router in Data mode.
- **Backend**: Hono, Cloudflare Workers.
- **Database**: Drizzle ORM over D1 (SQLite).
- **Auth**: Hono Native (JWT + Cookie).

## Database Schema Strategy (Multi-tenant)
- **Primary Key**: UUID v4 (preferred over auto-increment for SaaS scalability/security).
- **Foreign Keys**: ALL tables (except `users`) MUST have a `user_id` column.
- **Indexing**: All queries will filter by `user_id`. Create composite indexes `[user_id, created_at]` for performance.

## Authentication Implementation
- **Session**: stateless JWT stored in secure HTTP-only cookie.
- **Middleware**: `authMiddleware` validates JWT and injects `userId` into Hono Context (`c.var.userId`).

## API Design Patterns
1. **Context Injection**: Never trust client-sent IDs for ownership. Always use `c.var.userId` from the token to filter data.
   - ❌ BAD: `DELETE /transactions?id=5` (Vulnerable IDOR)
   - ✅ GOOD: `DELETE /transactions/:id` -> `WHERE id = :id AND user_id = c.var.userId`

2. **Onboarding Service**: A dedicated service function `initializeUserDefaults(userId)` runs inside a transaction immediately after user creation.