import type { Proposito } from "@workspace/shared"
import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core"

export const especiesTable = pgTable("especies", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 60 }).notNull().unique("uk_especies_slug"),
  name: varchar("name", { length: 60 }).notNull(),
  icon: varchar("icon", { length: 30 }).notNull().default("beef"),
  sortOrder: integer("sort_order").notNull().default(0),
})

export const razasTable = pgTable("razas", {
  id: serial("id").primaryKey(),
  especieId: integer("especie_id")
    .notNull()
    .references(() => especiesTable.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 80 }).notNull().unique("uk_razas_slug"),
  name: varchar("name", { length: 80 }).notNull(),
  proposito: varchar("proposito", { length: 20 }).$type<Proposito>(),
})

/** Configuración clave/valor editable desde el admin (tasa BCV, WhatsApp de soporte…). */
export const settingsTable = pgTable("settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
