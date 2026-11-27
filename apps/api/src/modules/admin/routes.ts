import { db } from "#database/connection.ts"
import {
  anunciosTable,
  auditLogTable,
  consultasTable,
  denunciasTable,
  especiesTable,
  fincasTable,
  pujasTable,
  rolesTable,
  subastaLotesTable,
  subastasTable,
  usersTable,
  usersToRolesTable,
} from "#database/schemas/index.ts"
import { authRequired, loadAuthUser, requireRole, type AppEnv } from "#modules/shared/http/auth.ts"
import { badRequest, conflict, fieldError, notFound } from "#modules/shared/http/errors.ts"
import { validate } from "#modules/shared/http/validator.ts"
import { pagination, paramId } from "#modules/shared/lib/utils.ts"
import {
  ROLES,
  adminUserUpdateDto,
  normalizarTelefono,
  userRolesDto,
  userStatusDto,
  type AdminStats,
} from "@workspace/shared"
import { and, desc, eq, gt, ilike, inArray, ne, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { anunciosAdminRoutes } from "#modules/anuncios/routes.ts"
import { catalogoAdminRoutes } from "#modules/catalogo/routes.ts"
import { denunciasAdminRoutes } from "#modules/denuncias/routes.ts"
import { audit } from "./audit.ts"
import { fincasAdminRoutes } from "#modules/fincas/routes.ts"
import { serviciosAdminRoutes } from "#modules/servicios/routes.ts"
import { solicitudesAdminRoutes } from "#modules/solicitudes/routes.ts"
import { subastasAdminRoutes } from "#modules/subastas/routes.ts"

/** Todo lo que consume el panel admin cuelga de /admin. */
export const adminRoutes = new Hono<AppEnv>()
const usuariosRoutes = new Hono<AppEnv>()
usuariosRoutes.use(authRequired, requireRole("admin"))

const count = sql<number>`count(*)::int`

adminRoutes.get("/stats", authRequired, requireRole("admin"), async (c) => {
  const [
    [usuarios],
    [ganaderos],
    [fincas],
    [fincasPendientes],
    [anunciosPublicados],
    [anunciosPendientes],
    [subastasPendientes],
    [denunciasPendientes],
    [consultas],
    porEstado,
    porEspecie,
  ] = await Promise.all([
    db.select({ n: count }).from(usersTable),
    db
      .select({ n: count })
      .from(usersToRolesTable)
      .innerJoin(rolesTable, eq(rolesTable.id, usersToRolesTable.roleId))
      .where(eq(rolesTable.name, "ganadero")),
    db.select({ n: count }).from(fincasTable),
    db.select({ n: count }).from(fincasTable).where(eq(fincasTable.verificacion, "pendiente")),
    db.select({ n: count }).from(anunciosTable).where(eq(anunciosTable.status, "publicado")),
    db.select({ n: count }).from(anunciosTable).where(eq(anunciosTable.status, "pendiente")),
    db.select({ n: count }).from(subastasTable).where(eq(subastasTable.status, "pendiente")),
    db.select({ n: count }).from(denunciasTable).where(eq(denunciasTable.status, "pendiente")),
    db.select({ n: count }).from(consultasTable),
    db
      .select({ estado: anunciosTable.estado, total: count })
      .from(anunciosTable)
      .where(eq(anunciosTable.status, "publicado"))
      .groupBy(anunciosTable.estado)
      .orderBy(desc(count)),
    db
      .select({ especie: especiesTable.name, total: count })
      .from(anunciosTable)
      .innerJoin(especiesTable, eq(especiesTable.id, anunciosTable.especieId))
      .where(eq(anunciosTable.status, "publicado"))
      .groupBy(especiesTable.name)
      .orderBy(desc(count)),
  ])

  return c.json({
    usuarios: usuarios.n,
    ganaderos: ganaderos.n,
    fincas: fincas.n,
    fincasPendientes: fincasPendientes.n,
    anunciosPublicados: anunciosPublicados.n,
    anunciosPendientes: anunciosPendientes.n,
    subastasPendientes: subastasPendientes.n,
    denunciasPendientes: denunciasPendientes.n,
    consultas: consultas.n,
    porEstado,
    porEspecie,
  } satisfies AdminStats)
})

// ─── Usuarios ────────────────────────────────────────────────────────────────

usuariosRoutes.get(
  "/",
  validate(
    "query",
    z.object({
      q: z.string().trim().optional(),
      role: z.enum(ROLES).optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    })
  ),
  async (c) => {
    const q = c.req.valid("query")
    const where = and(
      q.q
        ? or(
            ilike(usersTable.name, `%${q.q}%`),
            ilike(usersTable.email, `%${q.q}%`),
            ilike(usersTable.documentNumber, `%${q.q}%`)
          )
        : undefined,
      q.role
        ? sql`exists (
            select 1 from ${usersToRolesTable} ur join ${rolesTable} r on r.id = ur.role_id
            where ur.user_id = ${usersTable}."id" and r.name = ${q.role}
          )`
        : undefined
    )
    const { limit, offset } = pagination(q.page, q.limit)
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          phone: usersTable.phone,
          documentType: usersTable.documentType,
          documentNumber: usersTable.documentNumber,
          status: usersTable.status,
          createdAt: usersTable.createdAt,
          roles: sql<string[]>`coalesce((
            select array_agg(r.name order by r.name) from ${usersToRolesTable} ur
            join ${rolesTable} r on r.id = ur.role_id where ur.user_id = ${usersTable}."id"
          ), '{}')`,
        })
        .from(usersTable)
        .where(where)
        .orderBy(desc(usersTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count }).from(usersTable).where(where),
    ])
    return c.json({ items, total, page: q.page, limit })
  }
)

usuariosRoutes.patch("/:id/status", validate("json", userStatusDto), async (c) => {
  const id = paramId(c.req.param("id"))
  if (id === c.get("user").id) throw badRequest("No puedes suspender tu propia cuenta")
  const [row] = await db
    .update(usersTable)
    .set({ status: c.req.valid("json").status })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, status: usersTable.status, email: usersTable.email })
  if (!row) throw notFound("Usuario no encontrado")
  await audit(c.get("user"), "usuario.estado", "usuario", row.id, `${row.email} → ${row.status}`)
  return c.json(row)
})

usuariosRoutes.put("/:id/roles", validate("json", userRolesDto), async (c) => {
  const id = paramId(c.req.param("id"))
  const { roles } = c.req.valid("json")
  if (id === c.get("user").id && !roles.includes("admin")) {
    throw badRequest("No puedes quitarte el rol de administrador")
  }
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, id))
  if (!user) throw notFound("Usuario no encontrado")
  const roleRows = await db.select().from(rolesTable).where(inArray(rolesTable.name, roles))
  await db.transaction(async (tx) => {
    await tx.delete(usersToRolesTable).where(eq(usersToRolesTable.userId, id))
    await tx.insert(usersToRolesTable).values(roleRows.map((r) => ({ userId: id, roleId: r.id })))
  })
  await audit(c.get("user"), "usuario.roles", "usuario", id, `${user.email} → ${roles.join(", ")}`)
  return c.json({ id, roles })
})

/** Edita nombre, correo, teléfono y documento de un usuario. */
usuariosRoutes.put("/:id", validate("json", adminUserUpdateDto), async (c) => {
  const id = paramId(c.req.param("id"))
  const dto = c.req.valid("json")
  const dupes = await db
    .select({ email: usersTable.email, documentNumber: usersTable.documentNumber })
    .from(usersTable)
    .where(
      and(
        ne(usersTable.id, id),
        or(
          eq(usersTable.email, dto.email),
          dto.documentNumber ? eq(usersTable.documentNumber, dto.documentNumber) : undefined
        )
      )
    )
  if (dupes.some((u) => u.email === dto.email)) throw fieldError("email", "Otro usuario ya usa ese correo")
  if (dupes.length) throw fieldError("documentNumber", "Otro usuario ya tiene ese documento")

  const [row] = await db
    .update(usersTable)
    .set({
      name: dto.name,
      email: dto.email,
      phone: dto.phone ? normalizarTelefono(dto.phone) : null,
      documentType: dto.documentNumber ? (dto.documentType ?? "cedula") : null,
      documentNumber: dto.documentNumber ?? null,
    })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, email: usersTable.email })
  if (!row) throw notFound("Usuario no encontrado")
  await audit(c.get("user"), "usuario.editar", "usuario", row.id, `${row.email} (${dto.name})`)
  return c.json(row)
})

/**
 * Elimina una cuenta y, en cascada, sus fincas, anuncios, remates, solicitudes y pujas.
 * Se bloquea si afectaría un remate en curso o si es el último administrador.
 */
usuariosRoutes.delete("/:id", async (c) => {
  const id = paramId(c.req.param("id"))
  const me = c.get("user")
  if (id === me.id) throw badRequest("No puedes eliminar tu propia cuenta")

  const target = await loadAuthUser(id)
  if (!target) throw notFound("Usuario no encontrado")

  if (target.roles.includes("admin")) {
    const [{ admins }] = await db
      .select({ admins: count })
      .from(usersToRolesTable)
      .innerJoin(rolesTable, eq(rolesTable.id, usersToRolesTable.roleId))
      .where(eq(rolesTable.name, "admin"))
    if (admins <= 1) throw badRequest("No puedes eliminar al único administrador")
  }

  const now = new Date()
  const [[pujasVivas], [remates]] = await Promise.all([
    db
      .select({ n: count })
      .from(pujasTable)
      .innerJoin(subastaLotesTable, eq(subastaLotesTable.id, pujasTable.loteId))
      .innerJoin(subastasTable, eq(subastasTable.id, subastaLotesTable.subastaId))
      .where(and(eq(pujasTable.userId, id), eq(subastasTable.status, "programada"), gt(subastasTable.endsAt, now))),
    db
      .select({ n: count })
      .from(subastasTable)
      .where(
        and(
          eq(subastasTable.ownerId, id),
          inArray(subastasTable.status, ["pendiente", "programada"]),
          gt(subastasTable.endsAt, now)
        )
      ),
  ])
  if (pujasVivas.n || remates.n) {
    throw conflict(
      "La cuenta participa en un remate en curso. Suspéndela ahora y elimínala cuando el remate cierre."
    )
  }

  await db.delete(usersTable).where(eq(usersTable.id, id))
  await audit(me, "usuario.eliminar", "usuario", id, `${target.email} (${target.name})`)
  return c.body(null, 204)
})

// ─── Historial de acciones ───────────────────────────────────────────────────

const historialRoutes = new Hono<AppEnv>()
historialRoutes.use(authRequired, requireRole("admin"))

historialRoutes.get(
  "/",
  validate(
    "query",
    z.object({
      entityType: z.string().trim().max(30).optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    })
  ),
  async (c) => {
    const q = c.req.valid("query")
    const where = q.entityType ? eq(auditLogTable.entityType, q.entityType) : undefined
    const { limit, offset } = pagination(q.page, q.limit)
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: auditLogTable.id,
          action: auditLogTable.action,
          entityType: auditLogTable.entityType,
          entityId: auditLogTable.entityId,
          summary: auditLogTable.summary,
          adminName: auditLogTable.adminName,
          adminEmail: auditLogTable.adminEmail,
          createdAt: auditLogTable.createdAt,
        })
        .from(auditLogTable)
        .where(where)
        .orderBy(desc(auditLogTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count }).from(auditLogTable).where(where),
    ])
    return c.json({ items, total, page: q.page, limit })
  }
)

adminRoutes.route("/usuarios", usuariosRoutes)
adminRoutes.route("/historial", historialRoutes)
adminRoutes.route("/denuncias", denunciasAdminRoutes)
adminRoutes.route("/anuncios", anunciosAdminRoutes)
adminRoutes.route("/fincas", fincasAdminRoutes)
adminRoutes.route("/subastas", subastasAdminRoutes)
adminRoutes.route("/servicios", serviciosAdminRoutes)
adminRoutes.route("/solicitudes", solicitudesAdminRoutes)
adminRoutes.route("/catalogo", catalogoAdminRoutes)
