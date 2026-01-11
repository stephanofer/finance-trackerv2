import { Hono } from "hono";
const app = new Hono<{ Bindings: Env }>();

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

app.post("/api/ai/classify", async (c) => {
  const { description } = await c.req.json();

  // La clave aquí es el "System Prompt" para obtener resultados consistentes
  const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
    messages: [
      {
        role: "system",
        content:
          'Eres un motor de categorización financiera. Responde ÚNICAMENTE con un JSON: {"category": "string", "confidence": number}. Categorías: Comida, Transporte, Vivienda, Ocio, Salud.',
      },
      { role: "user", content: `Clasifica: ${description}` },
    ],
    // Forzamos respuesta en formato JSON
    response_format: { type: "json_object" },
  });

  return c.json(response);
});

export default app;
