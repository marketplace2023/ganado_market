import { serve } from "@hono/node-server"
import { app } from "#app.ts"
import { env } from "#env.ts"
import { getPublicSettings } from "#modules/catalogo/settings.ts"

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API ganadera escuchando en http://localhost:${info.port}`)
})

// Mantiene la tasa BCV fresca (sólo descarga si está en modo automático y tiene más de 3 h).
const warmTasa = () => getPublicSettings().catch((err) => console.warn("Tasa BCV:", err.message))
warmTasa()
setInterval(warmTasa, 60 * 60 * 1000).unref()

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n✖ El puerto ${env.PORT} ya está en uso. Cierra el proceso que lo ocupa ` +
        `(PowerShell: netstat -ano | findstr :${env.PORT}  →  taskkill /PID <pid> /F) ` +
        `o cambia PORT en apps/api/.env.\n`
    )
  } else {
    console.error(err)
  }
  process.exit(1)
})
