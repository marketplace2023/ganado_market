import { db } from "#database/connection.ts"
import { anunciosTable, consultasTable, subastasTable } from "#database/schemas/index.ts"
import { anunciosGanaderoRoutes } from "#modules/anuncios/routes.ts"
import { consultasGanaderoRoutes } from "#modules/consultas/routes.ts"
import { fincasGanaderoRoutes } from "#modules/fincas/routes.ts"
import { authRequired, requireRole, type AppEnv } from "#modules/shared/http/auth.ts"
import { subastasGanaderoRoutes } from "#modules/subastas/routes.ts"
import type { GanaderoStats } from "@workspace/shared"
import { and, eq, gt, sql } from "drizzle-orm"
import { Hono } from "hono"

/** Todo lo que consume el panel del ganadero cuelga de /ganadero. */
export const ganaderoRoutes = new Hono<AppEnv>()

ganaderoRoutes.get("/stats", authRequired, requireRole("ganadero"), async (c) => {
  const ownerId = c.get("user").id
  const [[anuncios], [consultas], [subastas]] = await Promise.all([
    db
      .select({
        publicados: sql<number>`count(*) filter (where ${anunciosTable.status} = 'publicado')::int`,
        pendientes: sql<number>`count(*) filter (where ${anunciosTable.status} = 'pendiente')::int`,
        vistas: sql<number>`coalesce(sum(${anunciosTable.viewCount}), 0)::int`,
        whatsapp: sql<number>`coalesce(sum(${anunciosTable.whatsappClicks}), 0)::int`,
      })
      .from(anunciosTable)
      .where(eq(anunciosTable.ownerId, ownerId)),
    db
      .select({ nuevas: sql<number>`count(*)::int` })
      .from(consultasTable)
      .innerJoin(anunciosTable, eq(anunciosTable.id, consultasTable.anuncioId))
      .where(and(eq(anunciosTable.ownerId, ownerId), eq(consultasTable.status, "nueva"))),
    db
      .select({ activas: sql<number>`count(*)::int` })
      .from(subastasTable)
      .where(
        and(
          eq(subastasTable.ownerId, ownerId),
          eq(subastasTable.status, "programada"),
          gt(subastasTable.endsAt, new Date())
        )
      ),
  ])

  return c.json({
    anunciosPublicados: anuncios.publicados,
    anunciosPendientes: anuncios.pendientes,
    vistas: anuncios.vistas,
    whatsappClicks: anuncios.whatsapp,
    consultasNuevas: consultas.nuevas,
    subastasActivas: subastas.activas,
  } satisfies GanaderoStats)
})

ganaderoRoutes.route("/fincas", fincasGanaderoRoutes)
ganaderoRoutes.route("/anuncios", anunciosGanaderoRoutes)
ganaderoRoutes.route("/consultas", consultasGanaderoRoutes)
ganaderoRoutes.route("/subastas", subastasGanaderoRoutes)
