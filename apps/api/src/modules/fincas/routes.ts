import { db } from "#database/connection.ts"
import { fincasTable, usersTable } from "#database/schemas/index.ts"
import { audit } from "#modules/admin/audit.ts"
import { reservaVigenteEn } from "#modules/anuncios/reservas.ts"
import { authRequired, requireRole, type AppEnv } from "#modules/shared/http/auth.ts"
import { notFound } from "#modules/shared/http/errors.ts"
import { validate } from "#modules/shared/http/validator.ts"
import { paramId, uniqueSlug } from "#modules/shared/lib/utils.ts"
import { FINCA_VERIFICACION, fincaDto, normalizarTelefono, type FincaDto } from "@workspace/shared"
import { and, desc, eq, getTableColumns, sql } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

const publicColumns = {
  id: fincasTable.id,
  name: fincasTable.name,
  slug: fincasTable.slug,
  estado: fincasTable.estado,
  municipio: fincasTable.municipio,
  descripcion: fincasTable.descripcion,
  hectareas: fincasTable.hectareas,
  hierro: fincasTable.hierro,
  logoUrl: fincasTable.logoUrl,
  coverUrl: fincasTable.coverUrl,
  whatsapp: fincasTable.whatsapp,
  verificada: sql<boolean>`${fincasTable.verificacion} = 'verificada'`,
  createdAt: fincasTable.createdAt,
}

const ownedColumns = {
  ...getTableColumns(fincasTable),
  verificada: sql<boolean>`${fincasTable.verificacion} = 'verificada'`,
  anunciosCount: sql<number>`(
    select count(*)::int from anuncios a
    where a.finca_id = "fincas"."id" and a.status = 'publicado'
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

fincasRoutes.get("/:slug", async (c) => {
  const [finca] = await db
    .select({
      ...publicColumns,
      anunciosCount: sql<number>`(
        select count(*)::int from anuncios a
        where a.finca_id = "fincas"."id" and a.status = 'publicado'
          and not ${reservaVigenteEn(sql`a.id`)}
      )`,
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
