import { db } from "#database/connection.ts"
import {
  anuncioMediaTable,
  anunciosTable,
  consultasTable,
  especiesTable,
  fincasTable,
  razasTable,
  subastaLotesTable,
  usersTable,
} from "#database/schemas/index.ts"
import {
  authOptional,
  authRequired,
  requireRole,
  type AppEnv,
  type OptionalUserEnv,
} from "#modules/shared/http/auth.ts"
import { badRequest, conflict, notFound } from "#modules/shared/http/errors.ts"
import { validate } from "#modules/shared/http/validator.ts"
import { escapeLike, pagination, paramId } from "#modules/shared/lib/utils.ts"
import {
  ANUNCIO_STATUS,
  anuncioDto,
  anunciosQuery,
  consultaDto,
  normalizarTelefono,
  rejectDto,
  reservaAnuncioDto,
  type AnuncioStatus,
} from "@workspace/shared"
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import {
  anuncioCardQuery,
  anuncioOwnedQuery,
  countAnuncios,
  getAnuncioDetail,
} from "./queries.ts"
import { createAnuncio, updateAnuncio } from "./use-cases/save-anuncio.ts"
import { audit } from "#modules/admin/audit.ts"
import {
  anuncioDisponible,
  cerrarReservaVigente,
  crearReserva,
  liberarReserva,
  reservaActiva,
  ultimaReservaAnuncio,
} from "./reservas.ts"


// ═════════════════════════════════════════════════════════════════════════════
// Público
// ═════════════════════════════════════════════════════════════════════════════

export const anunciosRoutes = new Hono<OptionalUserEnv>()

anunciosRoutes.get("/", validate("query", anunciosQuery), async (c) => {
  const q = c.req.valid("query")
  const conditions: SQL[] = [anuncioDisponible]
  if (q.especie) conditions.push(eq(especiesTable.slug, q.especie))
  if (q.raza) conditions.push(eq(razasTable.slug, q.raza))
  if (q.estado) conditions.push(eq(anunciosTable.estado, q.estado))
  if (q.tipo) conditions.push(eq(anunciosTable.tipo, q.tipo))
  if (q.sexo) conditions.push(eq(anunciosTable.sexo, q.sexo))
  if (q.categoria) conditions.push(eq(anunciosTable.categoriaAnimal, q.categoria))
  if (q.minPrecio !== undefined) conditions.push(gte(anunciosTable.precioUsd, q.minPrecio))
  if (q.maxPrecio !== undefined) conditions.push(lte(anunciosTable.precioUsd, q.maxPrecio))
  if (q.minPeso !== undefined) conditions.push(gte(anunciosTable.pesoPromedioKg, q.minPeso))
  if (q.maxPeso !== undefined) conditions.push(lte(anunciosTable.pesoPromedioKg, q.maxPeso))
  if (q.minEdad !== undefined) conditions.push(gte(anunciosTable.edadMeses, q.minEdad))
  if (q.maxEdad !== undefined) conditions.push(lte(anunciosTable.edadMeses, q.maxEdad))
  if (q.finca) conditions.push(eq(fincasTable.slug, q.finca))
  if (q.q) {
    const term = `%${escapeLike(q.q)}%`
    conditions.push(
      or(
        ilike(anunciosTable.title, term),
        ilike(razasTable.name, term),
        ilike(anunciosTable.municipio, term)
      )!
    )
  }
  const where = and(...conditions)

  const orderBy = {
    recientes: [desc(anunciosTable.publishedAt)],
    precio_asc: [asc(anunciosTable.precioUsd)],
    precio_desc: [desc(anunciosTable.precioUsd)],
    destacados: [desc(anunciosTable.isFeatured), desc(anunciosTable.publishedAt)],
  }[q.orden]

  const { limit, offset } = pagination(q.page, q.limit)
  const [items, total] = await Promise.all([
    anuncioCardQuery().where(where).orderBy(...orderBy).limit(limit).offset(offset),
    countAnuncios(where),
  ])
  return c.json({ items, total, page: q.page, limit })
})

anunciosRoutes.get("/destacados", async (c) => {
  const items = await anuncioCardQuery()
    .where(anuncioDisponible)
    .orderBy(desc(anunciosTable.isFeatured), desc(anunciosTable.publishedAt))
    .limit(8)
  return c.json(items)
})

anunciosRoutes.get("/:slug", async (c) => {
  const detail = await getAnuncioDetail(
    and(
      eq(anunciosTable.slug, c.req.param("slug")),
      inArray(anunciosTable.status, ["publicado", "vendido"])
    )!
  )
  if (!detail) throw notFound("Anuncio no encontrado")
  await db
    .update(anunciosTable)
    .set({ viewCount: sql`${anunciosTable.viewCount} + 1` })
    .where(eq(anunciosTable.id, detail.id))
  return c.json(detail.reservado ? { ...detail, finca: { ...detail.finca, whatsapp: "" } } : detail)
})

/** Registro de clic en "Contactar por WhatsApp" (métrica para el ganadero). */
anunciosRoutes.post("/:id/whatsapp", async (c) => {
  await db
    .update(anunciosTable)
    .set({ whatsappClicks: sql`${anunciosTable.whatsappClicks} + 1` })
    .where(and(eq(anunciosTable.id, paramId(c.req.param("id"))), anuncioDisponible))
  return c.body(null, 204)
})

anunciosRoutes.post("/:id/consultas", authOptional, validate("json", consultaDto), async (c) => {
  const id = paramId(c.req.param("id"))
  const dto = c.req.valid("json")
  const consulta = await db.transaction(async (tx) => {
    const [anuncio] = await tx
      .select({ id: anunciosTable.id })
      .from(anunciosTable)
      .where(and(eq(anunciosTable.id, id), eq(anunciosTable.status, "publicado")))
      .for("update")
    if (!anuncio) throw notFound("Anuncio no disponible")
    if (await reservaActiva(tx, id)) throw conflict("El lote está reservado")

    const [row] = await tx
      .insert(consultasTable)
      .values({
        anuncioId: id,
        userId: c.get("user")?.id ?? null,
        name: dto.name,
        phone: normalizarTelefono(dto.phone) ?? dto.phone,
        email: dto.email ?? null,
        message: dto.message,
      })
      .returning({ id: consultasTable.id })
    return row
  })
  return c.json(consulta, 201)
})

// ═════════════════════════════════════════════════════════════════════════════
// Panel ganadero: /ganadero/anuncios
// ═════════════════════════════════════════════════════════════════════════════

export const anunciosGanaderoRoutes = new Hono<AppEnv>()
anunciosGanaderoRoutes.use(authRequired, requireRole("ganadero"))

const saveBody = anuncioDto.extend({ submit: z.boolean().default(false) })

anunciosGanaderoRoutes.get(
  "/",
  validate("query", z.object({ status: z.enum(ANUNCIO_STATUS).optional() })),
  async (c) => {
    const { status } = c.req.valid("query")
    const where = and(
      eq(anunciosTable.ownerId, c.get("user").id),
      status ? eq(anunciosTable.status, status) : undefined
    )
    const items = await anuncioOwnedQuery({ ultimaReserva: ultimaReservaAnuncio })
      .where(where)
      .orderBy(desc(anunciosTable.updatedAt))
    return c.json(items)
  }
)

anunciosGanaderoRoutes.get("/:id", async (c) => {
  const id = paramId(c.req.param("id"))
  const [anuncio] = await db
    .select()
    .from(anunciosTable)
    .where(and(eq(anunciosTable.id, id), eq(anunciosTable.ownerId, c.get("user").id)))
  if (!anuncio) throw notFound("Anuncio no encontrado")
  const media = await db
    .select({ url: anuncioMediaTable.url })
    .from(anuncioMediaTable)
    .where(eq(anuncioMediaTable.anuncioId, id))
    .orderBy(asc(anuncioMediaTable.sortOrder))
  return c.json({ ...anuncio, media: media.map((m) => m.url) })
})

anunciosGanaderoRoutes.post("/", validate("json", saveBody), async (c) => {
  const { submit, ...dto } = c.req.valid("json")
  return c.json(await createAnuncio(c.get("user").id, dto, submit), 201)
})

anunciosGanaderoRoutes.put("/:id", validate("json", saveBody), async (c) => {
  const { submit, ...dto } = c.req.valid("json")
  return c.json(await updateAnuncio(c.get("user").id, paramId(c.req.param("id")), dto, submit))
})

anunciosGanaderoRoutes.post("/:id/reservas", validate("json", reservaAnuncioDto), async (c) => {
  const reserva = await crearReserva(paramId(c.req.param("id")), c.get("user").id, c.req.valid("json"))
  return c.json(reserva, 201)
})

anunciosGanaderoRoutes.post("/:id/reservas/:reservaId/liberar", async (c) => {
  await liberarReserva(paramId(c.req.param("id")), paramId(c.req.param("reservaId")), c.get("user").id)
  return c.body(null, 204)
})

/** Transiciones que el ganadero puede hacer por su cuenta. */
const TRANSICIONES: Record<string, { from: AnuncioStatus[]; to: AnuncioStatus }> = {
  enviar: { from: ["borrador", "rechazado"], to: "pendiente" },
  pausar: { from: ["publicado"], to: "pausado" },
  reactivar: { from: ["pausado"], to: "publicado" },
  vendido: { from: ["publicado", "pausado"], to: "vendido" },
}

anunciosGanaderoRoutes.post(
  "/:id/estado",
  validate(
    "json",
    z.object({
      accion: z.enum(["enviar", "pausar", "reactivar", "vendido"]),
      reservaId: z.number().int().positive().optional(),
    })
  ),
  async (c) => {
    const id = paramId(c.req.param("id"))
    const { accion, reservaId } = c.req.valid("json")
    const t = TRANSICIONES[accion]
    const row = await db.transaction(async (tx) => {
      const [anuncio] = await tx
        .update(anunciosTable)
        .set({ status: t.to })
        .where(
          and(
            eq(anunciosTable.id, id),
            eq(anunciosTable.ownerId, c.get("user").id),
            inArray(anunciosTable.status, t.from)
          )
        )
        .returning({ id: anunciosTable.id, status: anunciosTable.status })
      if (!anuncio) throw badRequest("No se puede aplicar esa acción en el estado actual del anuncio")

      if (accion === "vendido") {
        if (reservaId !== undefined) {
          if (!(await cerrarReservaVigente(tx, id, "vendida", reservaId))) {
            throw conflict("La reserva cambió. Actualiza el anuncio antes de marcarlo como vendido.")
          }
        } else if (await reservaActiva(tx, id)) {
          throw conflict("El lote tiene una reserva vigente. Actualiza el anuncio para cerrar esa reserva.")
        }
      }
      return anuncio
    })
    return c.json(row)
  }
)

anunciosGanaderoRoutes.delete("/:id", async (c) => {
  const id = paramId(c.req.param("id"))
  await db.transaction(async (tx) => {
    const [anuncio] = await tx
      .select({ id: anunciosTable.id })
      .from(anunciosTable)
      .where(and(eq(anunciosTable.id, id), eq(anunciosTable.ownerId, c.get("user").id)))
      .for("update")
    if (!anuncio) throw notFound("Anuncio no encontrado")
    if (await reservaActiva(tx, id)) throw conflict("Libera la reserva antes de eliminar el anuncio")
    const [enSubasta] = await tx
      .select({ id: subastaLotesTable.id })
      .from(subastaLotesTable)
      .where(eq(subastaLotesTable.anuncioId, id))
      .limit(1)
    if (enSubasta) throw badRequest("El anuncio está incluido en una subasta; quítalo del lote primero")
    await tx.delete(anunciosTable).where(eq(anunciosTable.id, id))
  })
  return c.body(null, 204)
})

// ═════════════════════════════════════════════════════════════════════════════
// Admin: /admin/anuncios (moderación)
// ═════════════════════════════════════════════════════════════════════════════

export const anunciosAdminRoutes = new Hono<AppEnv>()
anunciosAdminRoutes.use(authRequired, requireRole("admin"))

anunciosAdminRoutes.get(
  "/",
  validate(
    "query",
    z.object({
      status: z.enum(ANUNCIO_STATUS).optional(),
      q: z.string().trim().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    })
  ),
  async (c) => {
    const q = c.req.valid("query")
    const where = and(
      q.status ? eq(anunciosTable.status, q.status) : undefined,
      q.q
        ? or(
            ilike(anunciosTable.title, `%${escapeLike(q.q)}%`),
            ilike(usersTable.email, `%${escapeLike(q.q)}%`)
          )
        : undefined
    )
    const { limit, offset } = pagination(q.page, q.limit)
    const [items, [{ total }]] = await Promise.all([
      anuncioOwnedQuery().where(where).orderBy(desc(anunciosTable.updatedAt)).limit(limit).offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(anunciosTable)
        .leftJoin(usersTable, eq(usersTable.id, anunciosTable.ownerId))
        .where(where),
    ])
    return c.json({ items, total, page: q.page, limit })
  }
)

/** Vista previa para moderar (incluye anuncios no públicos). */
anunciosAdminRoutes.get("/:id", async (c) => {
  const detail = await getAnuncioDetail(eq(anunciosTable.id, paramId(c.req.param("id"))))
  if (!detail) throw notFound("Anuncio no encontrado")
  return c.json(detail)
})

anunciosAdminRoutes.post("/:id/aprobar", async (c) => {
  const [row] = await db
    .update(anunciosTable)
    .set({
      status: "publicado",
      rejectionReason: null,
      publishedAt: sql`coalesce(${anunciosTable.publishedAt}, now())`,
    })
    .where(
      and(
        eq(anunciosTable.id, paramId(c.req.param("id"))),
        inArray(anunciosTable.status, ["pendiente", "rechazado"])
      )
    )
    .returning({ id: anunciosTable.id, status: anunciosTable.status, title: anunciosTable.title })
  if (!row) throw badRequest("Sólo se aprueban anuncios en revisión o rechazados")
  await audit(c.get("user"), "anuncio.aprobar", "anuncio", row.id, `Aprobó "${row.title}"`)
  return c.json(row)
})

anunciosAdminRoutes.post("/:id/rechazar", validate("json", rejectDto), async (c) => {
  const row = await db.transaction(async (tx) => {
    const [anuncio] = await tx
      .update(anunciosTable)
      .set({ status: "rechazado", rejectionReason: c.req.valid("json").reason })
      .where(eq(anunciosTable.id, paramId(c.req.param("id"))))
      .returning({ id: anunciosTable.id, status: anunciosTable.status, title: anunciosTable.title })
    if (!anuncio) throw notFound("Anuncio no encontrado")
    await cerrarReservaVigente(tx, anuncio.id, "retirada")
    return anuncio
  })
  await audit(
    c.get("user"),
    "anuncio.rechazar",
    "anuncio",
    row.id,
    `Rechazó "${row.title}": ${c.req.valid("json").reason}`
  )
  return c.json(row)
})

anunciosAdminRoutes.post("/:id/destacar", async (c) => {
  const [row] = await db
    .update(anunciosTable)
    .set({ isFeatured: sql`not ${anunciosTable.isFeatured}` })
    .where(eq(anunciosTable.id, paramId(c.req.param("id"))))
    .returning({ id: anunciosTable.id, isFeatured: anunciosTable.isFeatured, title: anunciosTable.title })
  if (!row) throw notFound("Anuncio no encontrado")
  await audit(
    c.get("user"),
    "anuncio.destacar",
    "anuncio",
    row.id,
    `${row.isFeatured ? "Destacó" : "Quitó el destacado de"} "${row.title}"`
  )
  return c.json(row)
})
