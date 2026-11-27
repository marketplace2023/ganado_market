import type { FincaVerificacion } from "@workspace/shared"
import { foreignKey, index, integer, numeric, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core"
import { usersTable } from "./users.ts"

/** Finca / hato: el "perfil de vendedor" del ganadero. Un ganadero puede tener varias. */
export const fincasTable = pgTable(
  "livestock_farm",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull().unique("uk_fincas_slug"),
    estado: varchar("estado", { length: 40 }).notNull(),
    municipio: varchar("municipio", { length: 120 }).notNull(),
    direccion: varchar("direccion", { length: 255 }),
    hectareas: numeric("hectareas", { precision: 12, scale: 2, mode: "number" }),
    descripcion: text("descripcion"),
    whatsapp: varchar("whatsapp", { length: 20 }).notNull(),
    rif: varchar("rif", { length: 20 }),
    hierro: varchar("hierro", { length: 60 }),
    logoUrl: varchar("logo_url", { length: 500 }),
    coverUrl: varchar("cover_url", { length: 500 }),
    verificacion: varchar("verificacion", { length: 20 })
      .notNull()
      .default("pendiente")
      .$type<FincaVerificacion>(),
    verificadaAt: timestamp("verificada_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    foreignKey({
      name: "fincas_owner_id_users_id_fk",
      columns: [t.ownerId],
      foreignColumns: [usersTable.id],
    }).onDelete("cascade"),
    index("ix_fincas_owner").on(t.ownerId),
  ]
)
