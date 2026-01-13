# FinTrack SaaS - Guía de Despliegue en Cloudflare

## 📋 Pre-requisitos

1. Cuenta de Cloudflare con Workers habilitado
2. CLI de Wrangler instalado: `npm install -g wrangler`
3. Node.js 18+ y pnpm instalados

## 🔧 Configuración Inicial

### 1. Autenticación con Cloudflare

```bash
# Login en Cloudflare
wrangler login

# Verificar que estás logueado
wrangler whoami
```

### 2. Crear la Base de Datos D1

```bash
# Crear la base de datos (ya está creada según wrangler.json)
# Si necesitas crear una nueva:
wrangler d1 create finance-tracker-saas

# Esto te dará un database_id que debes poner en wrangler.json
```

### 3. Aplicar Migraciones a D1

```bash
# Generar migraciones (si no las tienes)
pnpm db:generate

# Aplicar migraciones en LOCAL (para desarrollo)
wrangler d1 execute finance-tracker-saas --local --file=./drizzle/migrations/0000_shiny_medusa.sql

# Aplicar migraciones en PRODUCCIÓN
wrangler d1 execute finance-tracker-saas --remote --file=./drizzle/migrations/0000_shiny_medusa.sql
```

### 4. Crear el Bucket R2 (para attachments)

```bash
# Crear bucket para archivos adjuntos
wrangler r2 bucket create finance-tracker-saas

# Verificar que existe
wrangler r2 bucket list
```

### 5. Configurar Variables de Entorno (Secrets)

```bash
# JWT Secret (IMPORTANTE: Cambia esto en producción)
wrangler secret put JWT_SECRET
# Cuando te pida el valor, ingresa una clave segura de al menos 32 caracteres
# Ejemplo: openssl rand -hex 32

# Otras variables que puedas necesitar en el futuro
# wrangler secret put VARIABLE_NAME
```

## 🔐 Configuración de Autenticación

### Variables de Entorno Requeridas

| Variable | Descripción | Dónde configurar |
|----------|-------------|------------------|
| `JWT_SECRET` | Clave secreta para firmar JWT tokens | `wrangler secret put JWT_SECRET` |

### Actualizar el Middleware de Auth

Actualmente el JWT_SECRET está hardcodeado. Para producción, actualiza [src/worker/middlewares/auth.ts](src/worker/middlewares/auth.ts):

```typescript
// Cambiar de:
const JWT_SECRET = "fintrack-super-secret-key-change-in-production";

// A usar variable de entorno:
// El secret se obtiene del contexto en cada request
```

## 📦 Despliegue

### Desarrollo Local

```bash
# Iniciar servidor de desarrollo
pnpm dev

# La API estará en http://localhost:5173/api
```

### Build y Deploy

```bash
# Verificar que todo compila
pnpm check

# Desplegar a producción
pnpm deploy
```

## 🗂️ Estructura de wrangler.json

```jsonc
{
  "name": "finance-tracker-saas",
  "main": "./src/worker/index.ts",
  "compatibility_date": "2025-10-08",
  "compatibility_flags": ["nodejs_compat"],
  
  // Base de datos D1
  "d1_databases": [{
    "binding": "DB",           // Cómo accedes en el código: c.env.DB
    "database_name": "finance-tracker-saas",
    "database_id": "tu-database-id"
  }],
  
  // Storage R2 para archivos
  "r2_buckets": [{
    "bucket_name": "finance-tracker-saas",
    "binding": "BUCKET"        // Cómo accedes en el código: c.env.BUCKET
  }],
  
  // AI (opcional, para features futuros)
  "ai": {
    "binding": "AI"
  }
}
```

## 🔄 Flujo de Actualización

### Cuando hagas cambios al schema:

```bash
# 1. Modificar src/worker/db/schema.ts

# 2. Generar nueva migración
pnpm db:generate

# 3. Revisar el archivo SQL generado en drizzle/migrations/

# 4. Aplicar en local para probar
wrangler d1 execute finance-tracker-saas --local --file=./drizzle/migrations/XXXX_nombre.sql

# 5. Si todo funciona, aplicar en producción
wrangler d1 execute finance-tracker-saas --remote --file=./drizzle/migrations/XXXX_nombre.sql

# 6. Desplegar el código
pnpm deploy
```

## ⚠️ Consideraciones de Seguridad

1. **JWT_SECRET**: NUNCA lo commitees en el código. Usa `wrangler secret`.

2. **CORS**: En producción, limita los orígenes permitidos en [src/worker/index.ts](src/worker/index.ts):
   ```typescript
   cors({
     origin: ["https://fintracker.stephanofer.com"],
     credentials: true,
   })
   ```

3. **Cookies**: Ya están configuradas con `httpOnly`, `secure`, y `sameSite: Strict`.

4. **Rate Limiting**: Considera agregar rate limiting para prevenir abuso:
   ```bash
   # Cloudflare tiene rate limiting integrado
   # O puedes usar el middleware de Hono
   ```

## 🐛 Troubleshooting

### Error: "Database not found"
```bash
# Verificar que el database_id en wrangler.json es correcto
wrangler d1 list
```

### Error: "R2 bucket not found"
```bash
# Crear el bucket si no existe
wrangler r2 bucket create finance-tracker-saas
```

### Error: "JWT verification failed"
- Verificar que JWT_SECRET está configurado correctamente
- El token puede haber expirado (90 días por defecto)

### Ver logs en producción
```bash
wrangler tail
```

## 📊 Monitoreo

- **Dashboard de Cloudflare**: Workers & Pages > finance-tracker-saas
- **Observability**: Ya está habilitado en wrangler.json
- **Logs**: `wrangler tail` para ver logs en tiempo real
