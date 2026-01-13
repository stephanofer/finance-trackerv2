import type { Context } from "hono";

export type AppEnv = {
  Bindings: Env;
  Variables: {
    userId: string;
    userEmail: string;
  };
};

export type AuthContext = Context<AppEnv>;
