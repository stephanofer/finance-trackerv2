import { Hono } from "hono";

const health = new Hono<{ Bindings: Env }>();

health.get("", (c) => c.text("OK"));


export default health;