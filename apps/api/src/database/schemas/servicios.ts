import type { TipoServicio } from "@workspace/shared"
import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core"
import { usersTable } from "./users.ts"

/**
 * Directorio de actores de apoyo del ecosistema: transportistas de ganado, veterinarios,
 * técnicos de inseminación, proveedores de alimento. Lo gestiona el admin.
 */
export const serviciosTable = pgTable("servicios", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  tipo: varchar("tipo", { length: 20 }).notNull().$type<TipoServicio>(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull().default(""),
  whatsapp: varchar("whatsapp", { length: 20 }).notNull(),
  /** Estados (slugs) donde presta el servicio. */
  estados: text("estados").array().notNull().default([]),
  verified: boolean("verified").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
