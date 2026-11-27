import type { SubastaStatus } from "@workspace/shared"
import {
  foreignKey,
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
export const subastasTable = pgTable("livestock_auction", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(),
  fincaId: integer("finca_id").notNull(),
  title: varchar("title", { length: 150 }).notNull(),
  slug: varchar("slug", { length: 170 }).notNull().unique("uk_subastas_slug"),
  description: text("description").notNull().default(""),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  /** Estado guardado. "en_vivo"/"finalizada" se derivan de las fechas cuando está "programada". */
  status: varchar("status", { length: 20 }).notNull().default("borrador").$type<SubastaStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  foreignKey({
    name: "subastas_owner_id_users_id_fk",
    columns: [t.ownerId],
    foreignColumns: [usersTable.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "subastas_finca_id_fincas_id_fk",
    columns: [t.fincaId],
    foreignColumns: [fincasTable.id],
  }).onDelete("cascade"),
])

export const subastaLotesTable = pgTable(
  "livestock_auction_lot",
  {
    id: serial("id").primaryKey(),
    subastaId: integer("subasta_id").notNull(),
    anuncioId: integer("anuncio_id").notNull(),
    orden: integer("orden").notNull().default(1),
    precioBaseUsd: numeric("precio_base_usd", { precision: 14, scale: 2, mode: "number" }).notNull(),
    incrementoUsd: numeric("incremento_usd", { precision: 14, scale: 2, mode: "number" }).notNull(),
  },
  (t) => [
    foreignKey({
      name: "subasta_lotes_subasta_id_subastas_id_fk",
      columns: [t.subastaId],
      foreignColumns: [subastasTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "subasta_lotes_anuncio_id_anuncios_id_fk",
      columns: [t.anuncioId],
      foreignColumns: [anunciosTable.id],
    }).onDelete("cascade"),
    uniqueIndex("uk_subasta_lotes").on(t.subastaId, t.anuncioId),
  ]
)

export const pujasTable = pgTable(
  "livestock_auction_bid",
  {
    id: serial("id").primaryKey(),
    loteId: integer("lote_id").notNull(),
    userId: integer("user_id").notNull(),
    montoUsd: numeric("monto_usd", { precision: 14, scale: 2, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "pujas_lote_id_subasta_lotes_id_fk",
      columns: [t.loteId],
      foreignColumns: [subastaLotesTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "pujas_user_id_users_id_fk",
      columns: [t.userId],
      foreignColumns: [usersTable.id],
    }).onDelete("cascade"),
    index("ix_pujas_lote").on(t.loteId),
  ]
)
