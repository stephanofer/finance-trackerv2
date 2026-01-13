import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "../middlewares/auth";
import { generateId } from "../lib/crypto";

const attachmentsRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

// Apply auth middleware to all routes
attachmentsRouter.use("*", authMiddleware);

// Allowed file types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================
// POST /attachments/upload - Upload a file
// ============================================
attachmentsRouter.post("/upload", async (c) => {
  const userId = c.get("userId");
  
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const entityType = formData.get("entityType") as string | null; // transaction, debt, loan, goal
    const entityId = formData.get("entityId") as string | null;

    if (!file) {
      return c.json({ error: "No se proporcionó ningún archivo" }, 400);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({ 
        error: "Tipo de archivo no permitido. Use: JPG, PNG, WebP, HEIC o PDF",
        allowedTypes: ALLOWED_TYPES,
      }, 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ 
        error: "El archivo excede el tamaño máximo de 10MB",
        maxSize: "10MB",
      }, 400);
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop() || "bin";
    const fileId = generateId();
    const fileName = `${userId}/${entityType || "general"}/${fileId}.${fileExtension}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.BUCKET.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        userId,
        originalName: file.name,
        entityType: entityType || "",
        entityId: entityId || "",
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate public URL (if bucket is public) or signed URL
    // For now, we return the key which can be used to retrieve the file
    const fileUrl = `/api/attachments/${fileName}`;

    return c.json({
      message: "Archivo subido exitosamente",
      attachment: {
        id: fileId,
        fileName,
        originalName: file.name,
        contentType: file.type,
        size: file.size,
        url: fileUrl,
        entityType,
        entityId,
      },
    }, 201);
  } catch (error) {
    console.error("Error uploading file:", error);
    return c.json({ error: "Error al subir el archivo" }, 500);
  }
});

// ============================================
// GET /attachments/:path+ - Get file from R2
// ============================================
attachmentsRouter.get("/*", async (c) => {
  const userId = c.get("userId");
  const path = c.req.path.replace("/api/attachments/", "");

  // Security: Verify the file belongs to the user
  if (!path.startsWith(`${userId}/`)) {
    return c.json({ error: "No autorizado" }, 403);
  }

  try {
    const object = await c.env.BUCKET.get(path);

    if (!object) {
      return c.json({ error: "Archivo no encontrado" }, 404);
    }

    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
    headers.set("Cache-Control", "private, max-age=3600");
    
    // For images, allow inline display. For others, force download
    const contentType = object.httpMetadata?.contentType || "";
    if (contentType.startsWith("image/")) {
      headers.set("Content-Disposition", "inline");
    } else {
      const originalName = object.customMetadata?.originalName || "file";
      headers.set("Content-Disposition", `attachment; filename="${originalName}"`);
    }

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Error retrieving file:", error);
    return c.json({ error: "Error al obtener el archivo" }, 500);
  }
});

// ============================================
// DELETE /attachments/:path+ - Delete file from R2
// ============================================
attachmentsRouter.delete("/*", async (c) => {
  const userId = c.get("userId");
  const path = c.req.path.replace("/api/attachments/", "");

  // Security: Verify the file belongs to the user
  if (!path.startsWith(`${userId}/`)) {
    return c.json({ error: "No autorizado" }, 403);
  }

  try {
    await c.env.BUCKET.delete(path);
    return c.json({ message: "Archivo eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return c.json({ error: "Error al eliminar el archivo" }, 500);
  }
});

// ============================================
// GET /attachments/list/:entityType/:entityId - List files for an entity
// ============================================
attachmentsRouter.get("/list/:entityType/:entityId", async (c) => {
  const userId = c.get("userId");
  const entityType = c.req.param("entityType");
  const entityId = c.req.param("entityId");

  try {
    const prefix = `${userId}/${entityType}/`;
    const listed = await c.env.BUCKET.list({ prefix });

    // Filter by entityId in metadata
    const files = await Promise.all(
      listed.objects.map(async (obj) => {
        const fullObject = await c.env.BUCKET.head(obj.key);
        if (fullObject?.customMetadata?.entityId === entityId) {
          return {
            key: obj.key,
            size: obj.size,
            uploaded: obj.uploaded,
            originalName: fullObject.customMetadata?.originalName,
            contentType: fullObject.httpMetadata?.contentType,
            url: `/api/attachments/${obj.key}`,
          };
        }
        return null;
      })
    );

    return c.json({
      attachments: files.filter(Boolean),
    });
  } catch (error) {
    console.error("Error listing files:", error);
    return c.json({ error: "Error al listar archivos" }, 500);
  }
});

export default attachmentsRouter;
