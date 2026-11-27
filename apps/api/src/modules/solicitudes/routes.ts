import { db } from "#database/connection.ts"
import {
  especiesTable,
  solicitudContactosTable,
  solicitudesTable,
  usersTable,
} from "#database/schemas/index.ts"
import { audit } from "#modules/admin/audit.ts"
import { authRequired, requireRole, type AppEnv } from "#modules/shared/http/auth.ts"
import { badRequest, forbidden, notFound } from "#modules/shared/http/errors.ts"
import { validate } from "#modules/shared/http/validator.ts"
import { pagination, paramId } from "#modules/shared/lib/utils.ts"
import {
  SOLICITUD_DIAS_VIGENCIA,
  SOLICITUD_STATUS,
  solicitudDto,
  solicitudesQuery,
  type SolicitudContacto,
  type SolicitudDto,
} from "@workspace/shared"
import { and, desc, eq, gt, lte, sql, type SQL } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

/** Máximo de solicitudes activas por persona (evita spam). */
const MAX_ACTIVAS = 5
const vigencia = () => new Date(Date.now() + SOLICITUD_DIAS_VIGENCIA * 24 * 60 * 60 * 1000)

const columns = {
  id: solicitudesTable.id,
  title: solicitudesTable.title,
  description: solicitudesTable.description,
  especieName: especiesTable.name,
  especieSlug: especiesTable.slug,
  cantidad: solicitudesTable.cantidad,
  pesoMinKg: solicitudesTable.pesoMinKg,
  pesoMaxKg: solicitudesTable.pesoMaxKg,
  presupuestoMinUsd: solicitudesTable.presupuestoMinUsd,
  presupuestoMaxUsd: solicitudesTable.presupuestoMaxUsd,
  modalidadPrecio: solicitudesTable.modalidadPrecio,
  estado: solicitudesTable.estado,
  urgencia: solicitudesTable.urgencia,
  status: solicitudesTable.status,
  createdAt: solicitudesTable.createdAt,
  expiresAt: solicitudesTable.expiresAt,
  autorName: usersTable.name,
  contactosCount: sql<number>`(
    select count(*)::int from ${solicitudContactosTable} sc where sc.solicitud_id = ${solicitudesTable}."id"
  )`,
}

function baseQuery() {
  return db
    .select(columns)
    .from(solicitudesTable)
    .innerJoin(usersTable, eq(usersTable.id, solicitudesTable.userId))
    .leftJoin(especiesTable, eq(especiesTable.id, solicitudesTable.especieId))
}

/** Identidad protegida: "María Fernanda Rojas" → "María R." / "MR". */
function protect<T extends { autorName: string }>(row: T) {
  const { autorName, ...rest } = row
  const parts = autorName.trim().split(/\s+/)
  const alias = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : `${parts[0].slice(0, 12)}…`
  const iniciales = (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
  return { ...rest, autorAlias: alias, autorIniciales: iniciales }
}

const vigente = () => and(eq(solicitudesTable.status, "activa"), gt(solicitudesTable.expiresAt, new Date()))

const toColumns = (dto: SolicitudDto) => ({
  ...dto,
  especieId: dto.especieId ?? null,
  cantidad: dto.cantidad ?? null,
  pesoMinKg: dto.pesoMinKg ?? null,
  pesoMaxKg: dto.pesoMaxKg ?? null,
  presupuestoMinUsd: dto.presupuestoMinUsd ?? null,
  presupuestoMaxUsd: dto.presupuestoMaxUsd ?? null,
  modalidadPrecio: dto.modalidadPrecio ?? null,
  estado: dto.estado ?? null,
})

// ═════════════════════════════════════════════════════════════════════════════
// Público + comprador: /solicitudes
// ═════════════════════════════════════════════════════════════════════════════

export const solicitudesRoutes = new Hono<AppEnv>()

solicitudesRoutes.get("/", validate("query", solicitudesQuery), async (c) => {
  const q = c.req.valid("query")
  const conditions: (SQL | undefined)[] = [vigente()]
  if (q.especie) conditions.push(eq(especiesTable.slug, q.especie))
  if (q.estado) conditions.push(eq(solicitudesTable.estado, q.estado))
  if (q.urgencia) conditions.push(eq(solicitudesTable.urgencia, q.urgencia))
  const where = and(...conditions)
  const { limit, offset } = pagination(q.page, q.limit)
  const [rows, [{ total }]] = await Promise.all([
    baseQuery().where(where).orderBy(desc(solicitudesTable.createdAt)).limit(limit).offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(solicitudesTable)
      .leftJoin(especiesTable, eq(especiesTable.id, solicitudesTable.especieId))
      .where(where),
  ])
  return c.json({ items: rows.map(protect), total, page: q.page, limit })
})

/** Las solicitudes del usuario (activas, cerradas y vencidas). */
solicitudesRoutes.get("/mias", authRequired, async (c) => {
  const rows = await baseQuery()
    .where(eq(solicitudesTable.userId, c.get("user").id))
    .orderBy(desc(solicitudesTable.createdAt))
  return c.json(rows.map(protect))
})

solicitudesRoutes.post("/", authRequired, validate("json", solicitudDto), async (c) => {
  const userId = c.get("user").id
  const [{ activas }] = await db
    .select({ activas: sql<number>`count(*)::int` })
    .from(solicitudesTable)
    .where(and(eq(solicitudesTable.userId, userId), vigente()))
  if (activas >= MAX_ACTIVAS) {
    throw badRequest(`Puedes tener hasta ${MAX_ACTIVAS} solicitudes activas. Cierra alguna para publicar otra.`)
  }
  const [row] = await db
    .insert(solicitudesTable)
    .values({ ...toColumns(c.req.valid("json")), userId, expiresAt: vigencia() })
    .returning({ id: solicitudesTable.id })
  return c.json(row, 201)
})

async function ownSolicitud(id: number, userId: number) {
  const [row] = await db
    .select({ id: solicitudesTable.id })
    .from(solicitudesTable)
    .where(and(eq(solicitudesTable.id, id), eq(solicitudesTable.userId, userId)))
  if (!row) throw notFound("Solicitud no encontrada")
  return row
}

solicitudesRoutes.post("/:id/cerrar", authRequired, async (c) => {
  const { id } = await ownSolicitud(paramId(c.req.param("id")), c.get("user").id)
  await db.update(solicitudesTable).set({ status: "cerrada" }).where(eq(solicitudesTable.id, id))
  return c.body(null, 204)
})

/** Reactiva una solicitud cerrada o vencida por otros 30 días. */
solicitudesRoutes.post("/:id/renovar", authRequired, async (c) => {
  const { id } = await ownSolicitud(paramId(c.req.param("id")), c.get("user").id)
  await db
    .update(solicitudesTable)
    .set({ status: "activa", expiresAt: vigencia() })
    .where(eq(solicitudesTable.id, id))
  return c.body(null, 204)
})

solicitudesRoutes.delete("/:id", authRequired, async (c) => {
  const { id } = await ownSolicitud(paramId(c.req.param("id")), c.get("user").id)
  await db.delete(solicitudesTable).where(eq(solicitudesTable.id, id))
  return c.body(null, 204)
})

/**
 * Datos de contacto del comprador. Sólo para ganaderos con sesión iniciada;
 * queda registrado para que el comprador vea cuántos ganaderos se interesaron.
 */
solicitudesRoutes.get("/:id/contacto", authRequired, requireRole("ganadero"), async (c) => {
  const id = paramId(c.req.param("id"))
  const me = c.get("user")
  const [row] = await db
    .select({
      userId: solicitudesTable.userId,
      name: usersTable.name,
      phone: usersTable.phone,
      email: usersTable.email,
    })
    .from(solicitudesTable)
    .innerJoin(usersTable, eq(usersTable.id, solicitudesTable.userId))
    .where(and(eq(solicitudesTable.id, id), vigente()))
  if (!row) throw notFound("La solicitud ya no está activa")
  if (row.userId === me.id) throw forbidden("Es tu propia solicitud")
  await db.insert(solicitudContactosTable).values({ solicitudId: id, userId: me.id }).onConflictDoNothing()
  return c.json({ name: row.name, phone: row.phone, email: row.email } satisfies SolicitudContacto)
})

// ═════════════════════════════════════════════════════════════════════════════
// Admin: /admin/solicitudes
// ═════════════════════════════════════════════════════════════════════════════

export const solicitudesAdminRoutes = new Hono<AppEnv>()
solicitudesAdminRoutes.use(authRequired, requireRole("admin"))

solicitudesAdminRoutes.get(
  "/",
  validate("query", z.object({ status: z.enum([...SOLICITUD_STATUS, "vencida"]).optional() })),
  async (c) => {
    const { status } = c.req.valid("query")
    const now = new Date()
    const where =
      status === "activa"
        ? vigente()
        : status === "vencida"
          ? and(eq(solicitudesTable.status, "activa"), lte(solicitudesTable.expiresAt, now))
          : status === "cerrada"
            ? eq(solicitudesTable.status, "cerrada")
            : undefined
    const rows = await db
      .select({ ...columns, autorEmail: usersTable.email })
      .from(solicitudesTable)
      .innerJoin(usersTable, eq(usersTable.id, solicitudesTable.userId))
      .leftJoin(especiesTable, eq(especiesTable.id, solicitudesTable.especieId))
      .where(where)
      .orderBy(desc(solicitudesTable.createdAt))
      .limit(200)
    return c.json(rows)
  }
)

solicitudesAdminRoutes.post("/:id/cerrar", async (c) => {
  const [row] = await db
    .update(solicitudesTable)
    .set({ status: "cerrada" })
    .where(eq(solicitudesTable.id, paramId(c.req.param("id"))))
    .returning({ id: solicitudesTable.id, title: solicitudesTable.title })
  if (!row) throw notFound("Solicitud no encontrada")
  await audit(c.get("user"), "solicitud.cerrar", "solicitud", row.id, `Cerró "${row.title}"`)
  return c.body(null, 204)
})

solicitudesAdminRoutes.delete("/:id", async (c) => {
  const [row] = await db
    .delete(solicitudesTable)
    .where(eq(solicitudesTable.id, paramId(c.req.param("id"))))
    .returning({ id: solicitudesTable.id, title: solicitudesTable.title })
  if (!row) throw notFound("Solicitud no encontrada")
  await audit(c.get("user"), "solicitud.eliminar", "solicitud", row.id, `Eliminó "${row.title}"`)
  return c.body(null, 204)
})
