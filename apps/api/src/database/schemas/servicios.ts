import type { TipoServicio } from "@workspace/shared"
import { foreignKey, boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core"
import { usersTable } from "./users.ts"

/**
 * Directorio de actores de apoyo del ecosistema: transportistas de ganado, veterinarios,
 * técnicos de inseminación, proveedores de alimento. Lo gestiona el admin.
 */
export const serviciosTable = pgTable("livestock_service", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  tipo: varchar("tipo", { length: 20 }).notNull().$type<TipoServicio>(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull().default(""),
  whatsapp: varchar("whatsapp", { length: 20 }).notNull(),
  /** Estados (slugs) donde presta el servicio. */
  estados: text("estados").array().notNull().default([]),
  verified: boolean("verified").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  foreignKey({
    name: "servicios_user_id_users_id_fk",
    columns: [t.userId],
    foreignColumns: [usersTable.id],
  }).onDelete("set null"),
])
