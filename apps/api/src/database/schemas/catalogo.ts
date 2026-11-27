import type { Proposito } from "@workspace/shared"
import { foreignKey, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core"

export const especiesTable = pgTable("livestock_species", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 60 }).notNull().unique("uk_especies_slug"),
  name: varchar("name", { length: 60 }).notNull(),
  icon: varchar("icon", { length: 30 }).notNull().default("beef"),
  sortOrder: integer("sort_order").notNull().default(0),
})

export const razasTable = pgTable("livestock_breed", {
  id: serial("id").primaryKey(),
  especieId: integer("especie_id").notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique("uk_razas_slug"),
  name: varchar("name", { length: 80 }).notNull(),
  proposito: varchar("proposito", { length: 20 }).$type<Proposito>(),
}, (t) => [
  foreignKey({
    name: "razas_especie_id_especies_id_fk",
    columns: [t.especieId],
    foreignColumns: [especiesTable.id],
  }).onDelete("cascade"),
])

/** Configuración clave/valor editable desde el admin (tasa BCV, WhatsApp de soporte…). */
export const settingsTable = pgTable("ir_config_parameter", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
