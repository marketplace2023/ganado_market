/**
 * Seed base (idempotente): roles, especies/razas, configuración y usuario administrador.
 *   npm run db:seed -w api
 */
import { db, pool } from "#database/connection.ts"
import {
  especiesTable,
  razasTable,
  rolesTable,
  settingsTable,
  usersTable,
  usersToRolesTable,
} from "#database/schemas/index.ts"
import { env } from "#env.ts"
import { SETTING_KEYS } from "#modules/catalogo/settings.ts"
import { hashPassword } from "#modules/shared/lib/utils.ts"
import { ESPECIES_SEED, ROLES, ROLE_LABEL } from "@workspace/shared"
import { eq } from "drizzle-orm"

async function seedRoles() {
  for (const name of ROLES) {
    await db
      .insert(rolesTable)
      .values({ name, description: ROLE_LABEL[name] })
      .onConflictDoUpdate({ target: rolesTable.name, set: { description: ROLE_LABEL[name] } })
  }
  console.log(`✓ ${ROLES.length} roles`)
}

async function seedCatalogo() {
  let razas = 0
  for (const [i, e] of ESPECIES_SEED.entries()) {
    const [especie] = await db
      .insert(especiesTable)
      .values({ slug: e.slug, name: e.name, icon: e.icon, sortOrder: i })
      .onConflictDoUpdate({
        target: especiesTable.slug,
        set: { name: e.name, icon: e.icon, sortOrder: i },
      })
      .returning({ id: especiesTable.id })
    for (const r of e.razas) {
      await db
        .insert(razasTable)
        .values({ ...r, especieId: especie.id })
        .onConflictDoUpdate({
          target: razasTable.slug,
          set: { name: r.name, proposito: r.proposito, especieId: especie.id },
        })
      razas++
    }
  }
  console.log(`✓ ${ESPECIES_SEED.length} especies, ${razas} razas`)
}

async function seedSettings() {
  // La tasa BCV se actualiza sola (tasa_auto=1) desde ve.dolarapi.com / bcv.org.ve.
  // El admin puede desactivarlo y cargarla a mano desde Configuración.
  for (const [key, value] of [
    [SETTING_KEYS.tasaAuto, "1"],
    [SETTING_KEYS.tasaBcv, "0"],
    [SETTING_KEYS.emailSoporte, ""],
    [SETTING_KEYS.whatsappSoporte, ""],
  ] as const) {
    await db.insert(settingsTable).values({ key, value }).onConflictDoNothing()
  }
  console.log("✓ configuración inicial")
}

async function seedAdmin() {
  const [adminRole] = await db.select().from(rolesTable).where(eq(rolesTable.name, "admin"))
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, env.ADMIN_EMAIL))

  const userId =
    existing?.id ??
    (
      await db
        .insert(usersTable)
        .values({
          name: "Administrador",
          email: env.ADMIN_EMAIL,
          password: await hashPassword(env.ADMIN_PASSWORD),
        })
        .returning({ id: usersTable.id })
    )[0].id

  await db.insert(usersToRolesTable).values({ userId, roleId: adminRole.id }).onConflictDoNothing()
  console.log(
    existing
      ? `✓ admin existente (${env.ADMIN_EMAIL}) — contraseña sin cambios`
      : `✓ admin creado: ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD}  ← cámbiala en producción`
  )
}

async function main() {
  await seedRoles()
  await seedCatalogo()
  await seedSettings()
  await seedAdmin()
}

main()
  .catch((err) => {
    console.error("Seed falló:", err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
