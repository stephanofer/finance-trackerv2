import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";

export type AuthVariables = {
  userId: string;
  userEmail: string;
};

export type AuthContext = Context<{
  Bindings: Env;
  Variables: AuthVariables;
}>;

// Fallback for development only
const DEV_JWT_SECRET = "fintrack-dev-secret-change-in-production";

/**
 * Get JWT secret from Cloudflare Secrets Store (production) or fallback (development)
 * 
 * In production: Uses env.SECRETS_STORE.get() to retrieve the secret
 * In development: Falls back to a dev secret (with warning)
 * 
 * @see https://developers.cloudflare.com/secrets-store/integrations/workers/
 */
export async function getJwtSecret(env: Env): Promise<string> {
  // Production: Get secret from Cloudflare Secrets Store
  if (env.SECRETS_STORE) {
    try {
      const secret = await env.SECRETS_STORE.get();
      if (secret) {
        console.log("🔐 JWT Secret loaded from Secrets Store:", secret.substring(0, 8) + "...[REDACTED]");
        return secret;
      }
      console.error("❌ SECRETS_STORE.get() returned empty value");
    } catch (error) {
      console.error("❌ Failed to retrieve JWT secret from Secrets Store:", error);
    }
  }
  
  // Development fallback
  console.warn("⚠️ SECRETS_STORE not available - Using development JWT secret");
  console.log("🔑 Dev JWT Secret:", DEV_JWT_SECRET.substring(0, 8) + "...[REDACTED]");
  return DEV_JWT_SECRET;
}

export async function authMiddleware(c: AuthContext, next: Next) {
  const token = getCookie(c, "auth_token");
  
  if (!token) {
    return c.json({ error: "No autorizado" }, 401);
  }

  try {
    const jwtSecret = await getJwtSecret(c.env);
    const payload = await verify(token, jwtSecret);
    
    if (!payload.sub || !payload.email) {
      return c.json({ error: "Token inválido" }, 401);
    }

    // Inject user info into context
    c.set("userId", payload.sub as string);
    c.set("userEmail", payload.email as string);

    await next();
  } catch {
    return c.json({ error: "Token inválido o expirado" }, 401);
  }
}
