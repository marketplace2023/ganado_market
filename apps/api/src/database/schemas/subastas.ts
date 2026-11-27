import type { SubastaStatus } from "@workspace/shared"
import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"
import { anunciosTable } from "./anuncios.ts"
import { fincasTable } from "./fincas.ts"
import { usersTable } from "./users.ts"

/** Remate virtual organizado por un ganadero. Un admin lo aprueba antes de publicarse. */
export const subastasTable = pgTable("subastas", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  fincaId: integer("finca_id")
    .notNull()
    .references(() => fincasTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 150 }).notNull(),
  slug: varchar("slug", { length: 170 }).notNull().unique("uk_subastas_slug"),
  description: text("description").notNull().default(""),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  /** Estado guardado. "en_vivo"/"finalizada" se derivan de las fechas cuando está "programada". */
  status: varchar("status", { length: 20 }).notNull().default("borrador").$type<SubastaStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const subastaLotesTable = pgTable(
  "subasta_lotes",
  {
    id: serial("id").primaryKey(),
    subastaId: integer("subasta_id")
      .notNull()
      .references(() => subastasTable.id, { onDelete: "cascade" }),
    anuncioId: integer("anuncio_id")
      .notNull()
      .references(() => anunciosTable.id, { onDelete: "cascade" }),
    orden: integer("orden").notNull().default(1),
    precioBaseUsd: numeric("precio_base_usd", { precision: 14, scale: 2, mode: "number" }).notNull(),
    incrementoUsd: numeric("incremento_usd", { precision: 14, scale: 2, mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("uk_subasta_lotes").on(t.subastaId, t.anuncioId)]
)

export const pujasTable = pgTable(
  "pujas",
  {
    id: serial("id").primaryKey(),
    loteId: integer("lote_id")
      .notNull()
      .references(() => subastaLotesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    montoUsd: numeric("monto_usd", { precision: 14, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ix_pujas_lote").on(t.loteId)]
)
