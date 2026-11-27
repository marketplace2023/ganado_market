import { db, type Transaction } from "#database/connection.ts"
import {
  anunciosTable,
  fincasTable,
  subastaLotesTable,
  subastasTable,
} from "#database/schemas/index.ts"
import { authRequired, requireRole, type AppEnv } from "#modules/shared/http/auth.ts"
import { badRequest, conflict, fieldError, notFound } from "#modules/shared/http/errors.ts"
import { validate } from "#modules/shared/http/validator.ts"
import { paramId, uniqueSlug } from "#modules/shared/lib/utils.ts"
import { SUBASTA_STATUS, loteDto, pujaDto, subastaDto, type SubastaDto } from "@workspace/shared"
import { and, asc, desc, eq, gt, inArray, lte, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { getLotes, subastaCardQuery, withEffectiveStatus } from "./queries.ts"
import { audit } from "#modules/admin/audit.ts"
import { placeBid } from "./use-cases/place-bid.ts"
import { anuncioReservado, reservaActiva } from "#modules/anuncios/reservas.ts"

// ═════════════════════════════════════════════════════════════════════════════
// Público: /subastas
// ═════════════════════════════════════════════════════════════════════════════

export const subastasRoutes = new Hono<AppEnv>()

subastasRoutes.get(
  "/",
  validate("query", z.object({ filtro: z.enum(["vigentes", "finalizadas"]).default("vigentes") })),
  async (c) => {
    const { filtro } = c.req.valid("query")
    const now = new Date()
    const where =
      filtro === "vigentes"
        ? and(eq(subastasTable.status, "programada"), gt(subastasTable.endsAt, now))
        : or(
            eq(subastasTable.status, "finalizada"),
            and(eq(subastasTable.status, "programada"), lte(subastasTable.endsAt, now))
          )
    const rows = await subastaCardQuery()
      .where(where)
      .orderBy(filtro === "vigentes" ? asc(subastasTable.startsAt) : desc(subastasTable.endsAt))
      .limit(50)
    return c.json(rows.map(withEffectiveStatus))
  }
)

subastasRoutes.get("/:slug", async (c) => {
  const [row] = await subastaCardQuery().where(
    and(
      eq(subastasTable.slug, c.req.param("slug")),
      inArray(subastasTable.status, ["programada", "finalizada"])
    )
  )
  if (!row) throw notFound("Subasta no encontrada")
  return c.json({ ...withEffectiveStatus(row), lotes: await getLotes(row.id) })
})

subastasRoutes.post(
  "/lotes/:loteId/pujas",
  authRequired,
  validate("json", pujaDto),
  async (c) => {
    const result = await placeBid(
      paramId(c.req.param("loteId")),
      c.get("user").id,
      c.req.valid("json").montoUsd
    )
    return c.json(result, 201)
  }
)

// ═════════════════════════════════════════════════════════════════════════════
// Panel ganadero: /ganadero/subastas
// ═════════════════════════════════════════════════════════════════════════════

export const subastasGanaderoRoutes = new Hono<AppEnv>()
subastasGanaderoRoutes.use(authRequired, requireRole("ganadero"))

async function ownSubasta(id: number, ownerId: number, tx?: Transaction) {
  const query = (tx ?? db)
    .select()
    .from(subastasTable)
    .where(and(eq(subastasTable.id, id), eq(subastasTable.ownerId, ownerId)))
  const [row] = await (tx ? query.for("update") : query)
  if (!row) throw notFound("Subasta no encontrada")
  return row
}

async function assertFinca(fincaId: number, ownerId: number) {
  const [finca] = await db
    .select({ id: fincasTable.id })
    .from(fincasTable)
    .where(and(eq(fincasTable.id, fincaId), eq(fincasTable.ownerId, ownerId)))
  if (!finca) throw fieldError("fincaId", "Selecciona una de tus fincas")
}

const EDITABLE = ["borrador", "pendiente"] as const

subastasGanaderoRoutes.get("/", async (c) => {
  const rows = await subastaCardQuery()
    .where(eq(subastasTable.ownerId, c.get("user").id))
    .orderBy(desc(subastasTable.createdAt))
  return c.json(rows.map(withEffectiveStatus))
})

subastasGanaderoRoutes.get("/:id", async (c) => {
  const id = paramId(c.req.param("id"))
  const [row] = await subastaCardQuery().where(
    and(eq(subastasTable.id, id), eq(subastasTable.ownerId, c.get("user").id))
  )
  if (!row) throw notFound("Subasta no encontrada")
  return c.json({ ...withEffectiveStatus(row), lotes: await getLotes(id, true) })
})

subastasGanaderoRoutes.post("/", validate("json", subastaDto), async (c) => {
  const dto: SubastaDto = c.req.valid("json")
  const ownerId = c.get("user").id
  await assertFinca(dto.fincaId, ownerId)
  const [row] = await db
    .insert(subastasTable)
    .values({ ...dto, ownerId, slug: uniqueSlug(dto.title), status: "borrador" })
    .returning()
  return c.json(row, 201)
})

subastasGanaderoRoutes.put("/:id", validate("json", subastaDto), async (c) => {
  const dto = c.req.valid("json")
  const ownerId = c.get("user").id
  const current = await ownSubasta(paramId(c.req.param("id")), ownerId)
  if (!(EDITABLE as readonly string[]).includes(current.status)) {
    throw badRequest("Sólo se editan subastas en borrador o en revisión")
  }
  await assertFinca(dto.fincaId, ownerId)
  const [row] = await db
    .update(subastasTable)
    .set(dto)
    .where(eq(subastasTable.id, current.id))
    .returning()
  return c.json(row)
})

subastasGanaderoRoutes.post("/:id/enviar", async (c) => {
  const current = await ownSubasta(paramId(c.req.param("id")), c.get("user").id)
  if (current.status !== "borrador") throw badRequest("La subasta ya fue enviada")
  if (current.startsAt <= new Date()) {
    throw fieldError("startsAt", "La fecha de inicio debe ser futura")
  }
  const [{ lotes }] = await db
    .select({ lotes: sql<number>`count(*)::int` })
    .from(subastaLotesTable)
    .where(eq(subastaLotesTable.subastaId, current.id))
  if (!lotes) throw badRequest("Agrega al menos un lote antes de enviar a revisión")
  await db.update(subastasTable).set({ status: "pendiente" }).where(eq(subastasTable.id, current.id))
  return c.json({ id: current.id, status: "pendiente" })
})

subastasGanaderoRoutes.post("/:id/lotes", validate("json", loteDto), async (c) => {
  const dto = c.req.valid("json")
  const ownerId = c.get("user").id
  const id = paramId(c.req.param("id"))
  const row = await db.transaction(async (tx) => {
    const subasta = await ownSubasta(id, ownerId, tx)
    if (!(EDITABLE as readonly string[]).includes(subasta.status)) {
      throw badRequest("No se pueden agregar lotes a una subasta aprobada")
    }
    const [anuncio] = await tx
      .select({ id: anunciosTable.id })
      .from(anunciosTable)
      .where(
        and(
          eq(anunciosTable.id, dto.anuncioId),
          eq(anunciosTable.ownerId, ownerId),
          eq(anunciosTable.status, "publicado")
        )
      )
      .for("update")
    if (!anuncio) throw fieldError("anuncioId", "Elige uno de tus anuncios publicados")
    if (await reservaActiva(tx, anuncio.id)) throw fieldError("anuncioId", "El lote tiene una reserva vigente")

    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${subastaLotesTable.orden}), 0)::int + 1` })
      .from(subastaLotesTable)
      .where(eq(subastaLotesTable.subastaId, subasta.id))
    const [lote] = await tx
      .insert(subastaLotesTable)
      .values({ ...dto, subastaId: subasta.id, orden: next })
      .returning()
    return lote
  })
  return c.json(row, 201)
})

subastasGanaderoRoutes.delete("/:id/lotes/:loteId", async (c) => {
  await db.transaction(async (tx) => {
    const subasta = await ownSubasta(paramId(c.req.param("id")), c.get("user").id, tx)
    if (!(EDITABLE as readonly string[]).includes(subasta.status)) {
      throw badRequest("No se pueden quitar lotes de una subasta aprobada")
    }
    await tx
      .delete(subastaLotesTable)
      .where(
        and(
          eq(subastaLotesTable.id, paramId(c.req.param("loteId"))),
          eq(subastaLotesTable.subastaId, subasta.id)
        )
      )
  })
  return c.body(null, 204)
})

// ═════════════════════════════════════════════════════════════════════════════
// Admin: /admin/subastas
// ═════════════════════════════════════════════════════════════════════════════

export const subastasAdminRoutes = new Hono<AppEnv>()
subastasAdminRoutes.use(authRequired, requireRole("admin"))

subastasAdminRoutes.get(
  "/",
  validate("query", z.object({ status: z.enum(SUBASTA_STATUS).optional() })),
  async (c) => {
    const { status } = c.req.valid("query")
    const rows = await subastaCardQuery()
      .where(
        status && status !== "en_vivo" && status !== "finalizada"
          ? eq(subastasTable.status, status)
          : undefined
      )
      .orderBy(desc(subastasTable.createdAt))
      .limit(200)
    const mapped = rows.map(withEffectiveStatus)
    return c.json(status ? mapped.filter((s) => s.status === status) : mapped)
  }
)

subastasAdminRoutes.get("/:id", async (c) => {
  const id = paramId(c.req.param("id"))
  const [row] = await subastaCardQuery().where(eq(subastasTable.id, id))
  if (!row) throw notFound("Subasta no encontrada")
  return c.json({ ...withEffectiveStatus(row), lotes: await getLotes(id, true) })
})

subastasAdminRoutes.post("/:id/aprobar", async (c) => {
  const id = paramId(c.req.param("id"))
  const row = await db.transaction(async (tx) => {
    const [subasta] = await tx
      .select({ id: subastasTable.id })
      .from(subastasTable)
      .where(and(eq(subastasTable.id, id), eq(subastasTable.status, "pendiente")))
      .for("update")
    if (!subasta) throw badRequest("Sólo se aprueban subastas en revisión")

    const lotes = await tx
      .select({ id: anunciosTable.id })
      .from(subastaLotesTable)
      .innerJoin(anunciosTable, eq(anunciosTable.id, subastaLotesTable.anuncioId))
      .where(eq(subastaLotesTable.subastaId, id))
      .orderBy(asc(anunciosTable.id))
      .for("update", { of: anunciosTable })
    if (!lotes.length) throw badRequest("El remate debe tener al menos un lote")

    const [noDisponible] = await tx
      .select({ title: anunciosTable.title })
      .from(anunciosTable)
      .where(and(inArray(anunciosTable.id, lotes.map((lote) => lote.id)), anuncioReservado))
      .limit(1)
    if (noDisponible) throw conflict(`El lote «${noDisponible.title}» tiene una reserva vigente`)

    const [actualizada] = await tx
      .update(subastasTable)
      .set({ status: "programada" })
      .where(eq(subastasTable.id, id))
      .returning({ id: subastasTable.id, status: subastasTable.status, title: subastasTable.title })
    return actualizada
  })
  await audit(c.get("user"), "subasta.aprobar", "subasta", row.id, `Aprobó "${row.title}"`)
  return c.json(row)
})

subastasAdminRoutes.post("/:id/cancelar", async (c) => {
  const [row] = await db
    .update(subastasTable)
    .set({ status: "cancelada" })
    .where(eq(subastasTable.id, paramId(c.req.param("id"))))
    .returning({ id: subastasTable.id, status: subastasTable.status, title: subastasTable.title })
  if (!row) throw notFound("Subasta no encontrada")
  await audit(c.get("user"), "subasta.cancelar", "subasta", row.id, `Canceló "${row.title}"`)
  return c.json(row)
})
