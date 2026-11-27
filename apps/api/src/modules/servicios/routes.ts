import { db } from "#database/connection.ts"
import { rolesTable, serviciosTable, usersTable, usersToRolesTable } from "#database/schemas/index.ts"
import { audit } from "#modules/admin/audit.ts"
import { authRequired, requireRole, type AppEnv } from "#modules/shared/http/auth.ts"
import { fieldError, notFound } from "#modules/shared/http/errors.ts"
import { validate } from "#modules/shared/http/validator.ts"
import { paramId } from "#modules/shared/lib/utils.ts"
import {
  TIPOS_SERVICIO,
  TIPO_SERVICIO_LABEL,
  normalizarTelefono,
  servicioDto,
  type RoleName,
  type ServicioDto,
  type TipoServicio,
} from "@workspace/shared"
import { and, arrayContains, asc, desc, eq } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

const columns = {
  id: serviciosTable.id,
  tipo: serviciosTable.tipo,
  name: serviciosTable.name,
  description: serviciosTable.description,
  whatsapp: serviciosTable.whatsapp,
  estados: serviciosTable.estados,
  verified: serviciosTable.verified,
  active: serviciosTable.active,
}

/** Rol del ecosistema que corresponde a cada tipo de servicio (si aplica). */
const ROL_POR_TIPO: Partial<Record<TipoServicio, RoleName>> = {
  transporte: "transportista",
  veterinario: "veterinario",
  inseminacion: "veterinario",
}

/**
 * Resuelve el correo de la cuenta vinculada → userId.
 * Si el tipo de servicio tiene un rol asociado, se lo asigna a la cuenta (sin quitarle los que tenga).
 */
async function resolveUser(dto: ServicioDto) {
  if (!dto.userEmail) return null
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, dto.userEmail))
  if (!user) throw fieldError("userEmail", "No existe una cuenta con ese correo")
  const rol = ROL_POR_TIPO[dto.tipo]
  if (rol) {
    const [role] = await db.select({ id: rolesTable.id }).from(rolesTable).where(eq(rolesTable.name, rol))
    if (role) await db.insert(usersToRolesTable).values({ userId: user.id, roleId: role.id }).onConflictDoNothing()
  }
  return user.id
}

const toColumns = (dto: ServicioDto, userId: number | null) => {
  const { userEmail: _e, ...rest } = dto
  return { ...rest, userId, whatsapp: normalizarTelefono(dto.whatsapp) ?? dto.whatsapp }
}

// ─── Público: /servicios?tipo=transporte&estado=apure ────────────────────────

export const serviciosRoutes = new Hono()

serviciosRoutes.get(
  "/",
  validate(
    "query",
    z.object({ tipo: z.enum(TIPOS_SERVICIO).optional(), estado: z.string().optional() })
  ),
  async (c) => {
    const q = c.req.valid("query")
    const rows = await db
      .select(columns)
      .from(serviciosTable)
      .where(
        and(
          eq(serviciosTable.active, true),
          q.tipo ? eq(serviciosTable.tipo, q.tipo) : undefined,
          q.estado ? arrayContains(serviciosTable.estados, [q.estado]) : undefined
        )
      )
      .orderBy(desc(serviciosTable.verified), asc(serviciosTable.name))
    return c.json(rows)
  }
)

// ─── Admin: /admin/servicios ─────────────────────────────────────────────────

export const serviciosAdminRoutes = new Hono<AppEnv>()
serviciosAdminRoutes.use(authRequired, requireRole("admin"))

serviciosAdminRoutes.get("/", async (c) =>
  c.json(
    await db
      .select({ ...columns, userEmail: usersTable.email })
      .from(serviciosTable)
      .leftJoin(usersTable, eq(usersTable.id, serviciosTable.userId))
      .orderBy(desc(serviciosTable.createdAt))
  )
)

serviciosAdminRoutes.post("/", validate("json", servicioDto), async (c) => {
  const dto = c.req.valid("json")
  const [row] = await db.insert(serviciosTable).values(toColumns(dto, await resolveUser(dto))).returning(columns)
  await audit(
    c.get("user"),
    "servicio.crear",
    "servicio",
    row.id,
    `${TIPO_SERVICIO_LABEL[row.tipo]}: "${row.name}"${dto.userEmail ? ` (cuenta ${dto.userEmail})` : ""}`
  )
  return c.json(row, 201)
})

serviciosAdminRoutes.put("/:id", validate("json", servicioDto), async (c) => {
  const dto = c.req.valid("json")
  const [row] = await db
    .update(serviciosTable)
    .set(toColumns(dto, await resolveUser(dto)))
    .where(eq(serviciosTable.id, paramId(c.req.param("id"))))
    .returning(columns)
  if (!row) throw notFound("Servicio no encontrado")
  await audit(c.get("user"), "servicio.editar", "servicio", row.id, `"${row.name}"`)
  return c.json(row)
})

serviciosAdminRoutes.delete("/:id", async (c) => {
  const [row] = await db
    .delete(serviciosTable)
    .where(eq(serviciosTable.id, paramId(c.req.param("id"))))
    .returning(columns)
  if (!row) throw notFound("Servicio no encontrado")
  await audit(c.get("user"), "servicio.eliminar", "servicio", row.id, `"${row.name}"`)
  return c.body(null, 204)
})
