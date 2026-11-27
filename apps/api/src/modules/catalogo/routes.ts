import { db } from "#database/connection.ts"
import { especiesTable, razasTable } from "#database/schemas/index.ts"
import { audit } from "#modules/admin/audit.ts"
import { authRequired, requireRole, type AppEnv } from "#modules/shared/http/auth.ts"
import { notFound } from "#modules/shared/http/errors.ts"
import { validate } from "#modules/shared/http/validator.ts"
import { paramId } from "#modules/shared/lib/utils.ts"
import { ESTADOS_VENEZUELA, especieDto, razaDto, settingsDto, type Especie } from "@workspace/shared"
import { asc, eq, sql } from "drizzle-orm"
import { Hono } from "hono"
import { getPublicSettings, saveSettings } from "./settings.ts"

export async function listEspecies(): Promise<Especie[]> {
  const [especies, razas] = await Promise.all([
    db.select().from(especiesTable).orderBy(asc(especiesTable.sortOrder), asc(especiesTable.name)),
    db.select().from(razasTable).orderBy(asc(razasTable.name)),
  ])
  return especies.map(({ sortOrder: _s, ...e }) => ({
    ...e,
    razas: razas.filter((r) => r.especieId === e.id),
  }))
}

// ─── Público ─────────────────────────────────────────────────────────────────

export const catalogoRoutes = new Hono()

catalogoRoutes.get("/especies", async (c) => c.json(await listEspecies()))
catalogoRoutes.get("/estados", (c) => c.json(ESTADOS_VENEZUELA))
catalogoRoutes.get("/settings", async (c) => c.json(await getPublicSettings()))

// ─── Admin ───────────────────────────────────────────────────────────────────

export const catalogoAdminRoutes = new Hono<AppEnv>()
catalogoAdminRoutes.use(authRequired, requireRole("admin"))

catalogoAdminRoutes.post("/especies", validate("json", especieDto), async (c) => {
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${especiesTable.sortOrder}), -1)::int + 1` })
    .from(especiesTable)
  const [row] = await db.insert(especiesTable).values({ ...c.req.valid("json"), sortOrder: next }).returning()
  await audit(c.get("user"), "especie.crear", "especie", row.id, `"${row.name}"`)
  return c.json(row, 201)
})

catalogoAdminRoutes.put("/especies/:id", validate("json", especieDto), async (c) => {
  const [row] = await db
    .update(especiesTable)
    .set(c.req.valid("json"))
    .where(eq(especiesTable.id, paramId(c.req.param("id"))))
    .returning()
  if (!row) throw notFound("Especie no encontrada")
  await audit(c.get("user"), "especie.editar", "especie", row.id, `"${row.name}"`)
  return c.json(row)
})

catalogoAdminRoutes.post("/razas", validate("json", razaDto), async (c) => {
  const [row] = await db.insert(razasTable).values(c.req.valid("json")).returning()
  await audit(c.get("user"), "raza.crear", "raza", row.id, `"${row.name}"`)
  return c.json(row, 201)
})

catalogoAdminRoutes.put("/razas/:id", validate("json", razaDto), async (c) => {
  const [row] = await db
    .update(razasTable)
    .set(c.req.valid("json"))
    .where(eq(razasTable.id, paramId(c.req.param("id"))))
    .returning()
  if (!row) throw notFound("Raza no encontrada")
  await audit(c.get("user"), "raza.editar", "raza", row.id, `"${row.name}"`)
  return c.json(row)
})

catalogoAdminRoutes.delete("/razas/:id", async (c) => {
  const [row] = await db
    .delete(razasTable)
    .where(eq(razasTable.id, paramId(c.req.param("id"))))
    .returning()
  if (!row) throw notFound("Raza no encontrada")
  await audit(c.get("user"), "raza.eliminar", "raza", row.id, `"${row.name}"`)
  return c.body(null, 204)
})

catalogoAdminRoutes.get("/settings", async (c) => c.json(await getPublicSettings()))
catalogoAdminRoutes.put("/settings", validate("json", settingsDto), async (c) => {
  const dto = c.req.valid("json")
  const saved = await saveSettings(dto)
  await audit(
    c.get("user"),
    "config.editar",
    "config",
    null,
    `Tasa ${dto.tasaAuto ? "automática" : `manual ${dto.tasaBcv}`}; soporte ${saved.whatsappSoporte || "—"} / ${saved.emailSoporte || "—"}`
  )
  return c.json(saved)
})
