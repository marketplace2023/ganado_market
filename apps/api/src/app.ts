import { env } from "#env.ts"
import { adminRoutes } from "#modules/admin/routes.ts"
import { anunciosRoutes } from "#modules/anuncios/routes.ts"
import { authRoutes } from "#modules/auth/routes.ts"
import { catalogoRoutes } from "#modules/catalogo/routes.ts"
import { denunciasRoutes } from "#modules/denuncias/routes.ts"
import { favoritosRoutes } from "#modules/favoritos/routes.ts"
import { fincasRoutes } from "#modules/fincas/routes.ts"
import { ganaderoRoutes } from "#modules/ganadero/routes.ts"
import { mediaRoutes } from "#modules/media/routes.ts"
import { serviciosRoutes } from "#modules/servicios/routes.ts"
import { solicitudesRoutes } from "#modules/solicitudes/routes.ts"
import { errorHandler } from "#modules/shared/http/errors.ts"
import { subastasRoutes } from "#modules/subastas/routes.ts"
import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { fileURLToPath } from "node:url"

export const app = new Hono()

app.use(
  "*",
  cors({
    origin: env.CORS_ORIGINS,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
)
if (env.NODE_ENV !== "test") app.use("*", logger())

// Fotos subidas en disco (fallback de desarrollo cuando no hay Cloudinary)
app.use("/uploads/*", serveStatic({ root: "./" }))
app.use(
  "/demo-images/*",
  serveStatic({ root: fileURLToPath(new URL("../assets", import.meta.url)) })
)

app.get("/", (c) => c.json({ status: "ok", service: "ganado-market-api" }))

// Público + comprador
app.route("/auth", authRoutes)
app.route("/catalogo", catalogoRoutes)
app.route("/anuncios", anunciosRoutes)
app.route("/fincas", fincasRoutes)
app.route("/subastas", subastasRoutes)
app.route("/servicios", serviciosRoutes)
app.route("/solicitudes", solicitudesRoutes)
app.route("/denuncias", denunciasRoutes)
app.route("/favoritos", favoritosRoutes)
app.route("/media", mediaRoutes)

// Panel ganadero
app.route("/ganadero", ganaderoRoutes)

// Panel administrador
app.route("/admin", adminRoutes)

app.notFound((c) => c.json({ message: "Ruta no encontrada" }, 404))
app.onError(errorHandler)
