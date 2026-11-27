import { db } from "#database/connection.ts"
import { anunciosTable, denunciasTable, usersTable } from "#database/schemas/index.ts"
import { audit } from "#modules/admin/audit.ts"
import { cerrarReservaVigente } from "#modules/anuncios/reservas.ts"
import { authRequired, requireRole, type AppEnv } from "#modules/shared/http/auth.ts"
import { badRequest, conflict, notFound } from "#modules/shared/http/errors.ts"
import { validate } from "#modules/shared/http/validator.ts"
import { paramId } from "#modules/shared/lib/utils.ts"
import { DENUNCIA_MOTIVO_LABEL, DENUNCIA_STATUS, denunciaDto } from "@workspace/shared"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { Hono } from "hono"
import { z } from "zod"

// ═════════════════════════════════════════════════════════════════════════════
// Público: POST /denuncias/anuncio/:id  (requiere sesión: evita spam anónimo)
// ═════════════════════════════════════════════════════════════════════════════

export const denunciasRoutes = new Hono<AppEnv>()

denunciasRoutes.post("/anuncio/:id", authRequired, validate("json", denunciaDto), async (c) => {
  const anuncioId = paramId(c.req.param("id"))
  const me = c.get("user")
  const [anuncio] = await db
    .select({ ownerId: anunciosTable.ownerId })
    .from(anunciosTable)
    .where(and(eq(anunciosTable.id, anuncioId), inArray(anunciosTable.status, ["publicado", "vendido"])))
  if (!anuncio) throw notFound("Anuncio no encontrado")
  if (anuncio.ownerId === me.id) throw badRequest("No puedes denunciar tu propio anuncio")

  const inserted = await db
    .insert(denunciasTable)
    .values({ anuncioId, userId: me.id, ...c.req.valid("json") })
    .onConflictDoNothing()
    .returning({ id: denunciasTable.id })
  if (!inserted.length) throw conflict("Ya denunciaste este anuncio. El equipo lo está revisando.")
  return c.json(inserted[0], 201)
})

// ═════════════════════════════════════════════════════════════════════════════
// Admin: /admin/denuncias
// ═════════════════════════════════════════════════════════════════════════════

export const denunciasAdminRoutes = new Hono<AppEnv>()
denunciasAdminRoutes.use(authRequired, requireRole("admin"))

const reporter = alias(usersTable, "reporter")
const owner = alias(usersTable, "owner")

denunciasAdminRoutes.get(
  "/",
  validate("query", z.object({ status: z.enum(DENUNCIA_STATUS).optional() })),
  async (c) => {
    const { status } = c.req.valid("query")
    const rows = await db
      .select({
        id: denunciasTable.id,
        motivo: denunciasTable.motivo,
        detalle: denunciasTable.detalle,
        status: denunciasTable.status,
        createdAt: denunciasTable.createdAt,
        resolvedAt: denunciasTable.resolvedAt,
        reporterEmail: reporter.email,
        anuncio: {
          id: anunciosTable.id,
          title: anunciosTable.title,
          slug: anunciosTable.slug,
          status: anunciosTable.status,
          ownerName: owner.name,
          ownerEmail: owner.email,
        },
        denunciasDelAnuncio: sql<number>`(
          select count(*)::int from denuncias d2
          where d2.anuncio_id = "denuncias"."anuncio_id" and d2.status = 'pendiente'
        )`,
      })
      .from(denunciasTable)
      .innerJoin(anunciosTable, eq(anunciosTable.id, denunciasTable.anuncioId))
      .innerJoin(owner, eq(owner.id, anunciosTable.ownerId))
      .leftJoin(reporter, eq(reporter.id, denunciasTable.userId))
      .where(status ? eq(denunciasTable.status, status) : undefined)
      .orderBy(desc(denunciasTable.createdAt))
      .limit(200)
    return c.json(rows)
  }
)

async function getDenuncia(id: number) {
  const [d] = await db
    .select({
      id: denunciasTable.id,
      anuncioId: denunciasTable.anuncioId,
      motivo: denunciasTable.motivo,
      status: denunciasTable.status,
      title: anunciosTable.title,
    })
    .from(denunciasTable)
    .innerJoin(anunciosTable, eq(anunciosTable.id, denunciasTable.anuncioId))
    .where(eq(denunciasTable.id, id))
  if (!d) throw notFound("Denuncia no encontrada")
  if (d.status !== "pendiente") throw badRequest("Esta denuncia ya fue resuelta")
  return d
}

/** Retira el anuncio (pasa a "rechazado" con el motivo) y da por atendidas todas sus denuncias pendientes. */
denunciasAdminRoutes.post(
  "/:id/retirar",
  validate("json", z.object({ reason: z.string().trim().max(500).optional() })),
  async (c) => {
    const d = await getDenuncia(paramId(c.req.param("id")))
    const me = c.get("user")
    const reason = c.req.valid("json").reason || `Retirado por denuncia: ${DENUNCIA_MOTIVO_LABEL[d.motivo]}`
    await db.transaction(async (tx) => {
      await tx
        .update(anunciosTable)
        .set({ status: "rechazado", rejectionReason: reason, isFeatured: false })
        .where(eq(anunciosTable.id, d.anuncioId))
      await cerrarReservaVigente(tx, d.anuncioId, "retirada")
      await tx
        .update(denunciasTable)
        .set({ status: "atendida", resolvedBy: me.id, resolvedAt: new Date() })
        .where(and(eq(denunciasTable.anuncioId, d.anuncioId), eq(denunciasTable.status, "pendiente")))
    })
    await audit(me, "anuncio.retirar", "anuncio", d.anuncioId, `Retiró "${d.title}": ${reason}`)
    return c.body(null, 204)
  }
)

denunciasAdminRoutes.post("/:id/descartar", async (c) => {
  const d = await getDenuncia(paramId(c.req.param("id")))
  const me = c.get("user")
  await db
    .update(denunciasTable)
    .set({ status: "descartada", resolvedBy: me.id, resolvedAt: new Date() })
    .where(eq(denunciasTable.id, d.id))
  await audit(me, "denuncia.descartar", "denuncia", d.id, `Denuncia sobre "${d.title}" (${DENUNCIA_MOTIVO_LABEL[d.motivo]})`)
  return c.body(null, 204)
})
