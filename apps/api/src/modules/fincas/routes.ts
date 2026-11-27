import { db } from "#database/connection.ts"
import { anunciosTable, fincasTable, usersTable } from "#database/schemas/index.ts"
import { audit } from "#modules/admin/audit.ts"
import { reservaVigenteEn } from "#modules/anuncios/reservas.ts"
import { authRequired, requireRole, type AppEnv } from "#modules/shared/http/auth.ts"
import { notFound } from "#modules/shared/http/errors.ts"
import { validate } from "#modules/shared/http/validator.ts"
import { escapeLike, pagination, paramId, uniqueSlug } from "#modules/shared/lib/utils.ts"
import {
  ESTADOS_VENEZUELA,
  FINCA_VERIFICACION,
  estadoSlug,
  fincaDto,
  normalizarTelefono,
  slugify,
  type FincaDto,
} from "@workspace/shared"
import { and, asc, count, desc, eq, getTableColumns, ilike, inArray, ne, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

const directoryColumns = {
  id: fincasTable.id,
  name: fincasTable.name,
  slug: fincasTable.slug,
  estado: fincasTable.estado,
  municipio: fincasTable.municipio,
  ubicacionPublica: fincasTable.ubicacionPublica,
  logoUrl: fincasTable.logoUrl,
  verificada: sql<boolean>`${fincasTable.verificacion} = 'verificada'`,
}

const publicColumns = {
  ...directoryColumns,
  descripcion: fincasTable.descripcion,
  hectareas: fincasTable.hectareas,
  hierro: fincasTable.hierro,
  coverUrl: fincasTable.coverUrl,
  whatsapp: fincasTable.whatsapp,
  createdAt: fincasTable.createdAt,
}

const anunciosDisponiblesCount = sql<number>`(
  select count(*)::int from ${anunciosTable} a
  where a.finca_id = ${fincasTable}."id" and a.status = 'publicado'
    and not ${reservaVigenteEn(sql`a.id`)}
)`

const ownedColumns = {
  ...getTableColumns(fincasTable),
  verificada: sql<boolean>`${fincasTable.verificacion} = 'verificada'`,
  anunciosCount: sql<number>`(
    select count(*)::int from ${anunciosTable} a
    where a.finca_id = ${fincasTable}."id" and a.status = 'publicado'
  )`,
}

const toColumns = (dto: FincaDto) => ({
  ...dto,
  whatsapp: normalizarTelefono(dto.whatsapp) ?? dto.whatsapp,
  direccion: dto.direccion ?? null,
  hectareas: dto.hectareas ?? null,
  descripcion: dto.descripcion ?? null,
  rif: dto.rif ?? null,
  hierro: dto.hierro ?? null,
  logoUrl: dto.logoUrl ?? null,
  coverUrl: dto.coverUrl ?? null,
})

// ─── Público ─────────────────────────────────────────────────────────────────

export const fincasRoutes = new Hono()

fincasRoutes.get(
  "/",
  validate(
    "query",
    z.object({
      q: z.string().trim().max(120).optional(),
      estado: estadoSlug.optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(48).default(24),
    })
  ),
  async (c) => {
    const { q, estado, page, limit } = c.req.valid("query")
    const estadoBuscado = q && slugify(q)
    const estados = estadoBuscado
      ? ESTADOS_VENEZUELA.filter((e) => e.slug.includes(estadoBuscado)).map((e) => e.slug)
      : []
    const term = q ? `%${escapeLike(q)}%` : undefined
    const where = and(
      ne(fincasTable.verificacion, "rechazada"),
      or(
        eq(fincasTable.verificacion, "verificada"),
        sql`exists (
          select 1 from ${anunciosTable} a
          where a.finca_id = ${fincasTable}."id" and a.status = 'publicado'
        )`
      ),
      estado ? eq(fincasTable.estado, estado) : undefined,
      term
        ? or(
            ilike(fincasTable.name, term),
            ilike(fincasTable.municipio, term),
            estados.length ? inArray(fincasTable.estado, estados) : undefined
          )
        : undefined
    )
    const { offset } = pagination(page, limit)
    const [items, [result]] = await Promise.all([
      db
        .select({ ...directoryColumns, anunciosCount: anunciosDisponiblesCount })
        .from(fincasTable)
        .where(where)
        .orderBy(desc(directoryColumns.verificada), asc(fincasTable.name), asc(fincasTable.id))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(fincasTable).where(where),
    ])
    return c.json({ items, total: result?.total ?? 0, page, limit })
  }
)

fincasRoutes.get("/:slug", async (c) => {
  const [finca] = await db
    .select({
      ...publicColumns,
      anunciosCount: anunciosDisponiblesCount,
    })
    .from(fincasTable)
    .where(eq(fincasTable.slug, c.req.param("slug")))
  if (!finca) throw notFound("Finca no encontrada")
  return c.json(finca)
})

// ─── Panel ganadero: /ganadero/fincas ────────────────────────────────────────

export const fincasGanaderoRoutes = new Hono<AppEnv>()
fincasGanaderoRoutes.use(authRequired, requireRole("ganadero"))

fincasGanaderoRoutes.get("/", async (c) => {
  const rows = await db
    .select(ownedColumns)
    .from(fincasTable)
    .where(eq(fincasTable.ownerId, c.get("user").id))
    .orderBy(desc(fincasTable.createdAt))
  return c.json(rows)
})

fincasGanaderoRoutes.get("/:id", async (c) => {
  const [row] = await db
    .select(ownedColumns)
    .from(fincasTable)
    .where(
      and(eq(fincasTable.id, paramId(c.req.param("id"))), eq(fincasTable.ownerId, c.get("user").id))
    )
  if (!row) throw notFound("Finca no encontrada")
  return c.json(row)
})

fincasGanaderoRoutes.post("/", validate("json", fincaDto), async (c) => {
  const dto = c.req.valid("json")
  const [row] = await db
    .insert(fincasTable)
    .values({ ...toColumns(dto), ownerId: c.get("user").id, slug: uniqueSlug(dto.name) })
    .returning()
  return c.json(row, 201)
})

/** Cambiar datos de identidad (nombre, RIF, hierro) vuelve a dejar la finca pendiente de verificación. */
fincasGanaderoRoutes.put("/:id", validate("json", fincaDto), async (c) => {
  const id = paramId(c.req.param("id"))
  const dto = c.req.valid("json")
  const [current] = await db
    .select()
    .from(fincasTable)
    .where(and(eq(fincasTable.id, id), eq(fincasTable.ownerId, c.get("user").id)))
  if (!current) throw notFound("Finca no encontrada")

  const next = toColumns(dto)
  const identityChanged =
    current.name !== next.name || current.rif !== next.rif || current.hierro !== next.hierro
  const [row] = await db
    .update(fincasTable)
    .set({
      ...next,
      ...(identityChanged && current.verificacion === "verificada"
        ? { verificacion: "pendiente" as const, verificadaAt: null }
        : {}),
    })
    .where(eq(fincasTable.id, id))
    .returning()
  return c.json(row)
})

// ─── Admin: /admin/fincas (verificación) ─────────────────────────────────────

export const fincasAdminRoutes = new Hono<AppEnv>()
fincasAdminRoutes.use(authRequired, requireRole("admin"))

fincasAdminRoutes.get(
  "/",
  validate("query", z.object({ verificacion: z.enum(FINCA_VERIFICACION).optional() })),
  async (c) => {
    const { verificacion } = c.req.valid("query")
    const rows = await db
      .select({ ...ownedColumns, ownerName: usersTable.name, ownerEmail: usersTable.email })
      .from(fincasTable)
      .innerJoin(usersTable, eq(usersTable.id, fincasTable.ownerId))
      .where(verificacion ? eq(fincasTable.verificacion, verificacion) : undefined)
      .orderBy(desc(fincasTable.createdAt))
      .limit(200)
    return c.json(rows)
  }
)

fincasAdminRoutes.post(
  "/:id/verificacion",
  validate("json", z.object({ verificacion: z.enum(FINCA_VERIFICACION) })),
  async (c) => {
    const { verificacion } = c.req.valid("json")
    const [row] = await db
      .update(fincasTable)
      .set({ verificacion, verificadaAt: verificacion === "verificada" ? new Date() : null })
      .where(eq(fincasTable.id, paramId(c.req.param("id"))))
      .returning({ id: fincasTable.id, verificacion: fincasTable.verificacion, name: fincasTable.name })
    if (!row) throw notFound("Finca no encontrada")
    await audit(c.get("user"), "finca.verificacion", "finca", row.id, `"${row.name}" → ${verificacion}`)
    return c.json(row)
  }
)
