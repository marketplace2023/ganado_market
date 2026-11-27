import { db } from "#database/connection.ts"
import { anunciosTable, consultasTable } from "#database/schemas/index.ts"
import { authRequired, requireRole, type AppEnv } from "#modules/shared/http/auth.ts"
import { notFound } from "#modules/shared/http/errors.ts"
import { validate } from "#modules/shared/http/validator.ts"
import { paramId } from "#modules/shared/lib/utils.ts"
import { CONSULTA_STATUS } from "@workspace/shared"
import { and, desc, eq } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

/** Panel ganadero: /ganadero/consultas — leads recibidos en sus anuncios. */
export const consultasGanaderoRoutes = new Hono<AppEnv>()
consultasGanaderoRoutes.use(authRequired, requireRole("ganadero"))

consultasGanaderoRoutes.get(
  "/",
  validate("query", z.object({ status: z.enum(CONSULTA_STATUS).optional() })),
  async (c) => {
    const { status } = c.req.valid("query")
    const rows = await db
      .select({
        id: consultasTable.id,
        anuncioId: consultasTable.anuncioId,
        anuncioTitle: anunciosTable.title,
        anuncioSlug: anunciosTable.slug,
        name: consultasTable.name,
        phone: consultasTable.phone,
        email: consultasTable.email,
        message: consultasTable.message,
        status: consultasTable.status,
        createdAt: consultasTable.createdAt,
      })
      .from(consultasTable)
      .innerJoin(anunciosTable, eq(anunciosTable.id, consultasTable.anuncioId))
      .where(
        and(
          eq(anunciosTable.ownerId, c.get("user").id),
          status ? eq(consultasTable.status, status) : undefined
        )
      )
      .orderBy(desc(consultasTable.createdAt))
      .limit(200)
    return c.json(rows)
  }
)

consultasGanaderoRoutes.patch(
  "/:id",
  validate("json", z.object({ status: z.enum(CONSULTA_STATUS) })),
  async (c) => {
    const id = paramId(c.req.param("id"))
    const [own] = await db
      .select({ id: consultasTable.id })
      .from(consultasTable)
      .innerJoin(anunciosTable, eq(anunciosTable.id, consultasTable.anuncioId))
      .where(and(eq(consultasTable.id, id), eq(anunciosTable.ownerId, c.get("user").id)))
    if (!own) throw notFound("Consulta no encontrada")
    const [row] = await db
      .update(consultasTable)
      .set({ status: c.req.valid("json").status })
      .where(eq(consultasTable.id, id))
      .returning()
    return c.json(row)
  }
)
