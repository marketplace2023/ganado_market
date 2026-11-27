import type { ModalidadPrecio, SolicitudStatus, Urgencia } from "@workspace/shared"
import {
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"
import { especiesTable } from "./catalogo.ts"
import { usersTable } from "./users.ts"

/** Solicitud de compra: un comprador publica lo que busca y los ganaderos lo contactan. */
export const solicitudesTable = pgTable(
  "solicitudes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    especieId: integer("especie_id").references(() => especiesTable.id, { onDelete: "set null" }),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull().default(""),
    cantidad: integer("cantidad"),
    pesoMinKg: numeric("peso_min_kg", { precision: 8, scale: 2, mode: "number" }),
    pesoMaxKg: numeric("peso_max_kg", { precision: 8, scale: 2, mode: "number" }),
    presupuestoMinUsd: numeric("presupuesto_min_usd", { precision: 14, scale: 2, mode: "number" }),
    presupuestoMaxUsd: numeric("presupuesto_max_usd", { precision: 14, scale: 2, mode: "number" }),
    modalidadPrecio: varchar("modalidad_precio", { length: 20 }).$type<ModalidadPrecio>(),
    estado: varchar("estado", { length: 40 }),
    urgencia: varchar("urgencia", { length: 20 }).notNull().$type<Urgencia>(),
    status: varchar("status", { length: 20 }).notNull().default("activa").$type<SolicitudStatus>(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ix_solicitudes_status").on(t.status, t.expiresAt), index("ix_solicitudes_user").on(t.userId)]
)

/** Qué ganaderos vieron el contacto de una solicitud (el comprador ve cuántos se interesaron). */
export const solicitudContactosTable = pgTable(
  "solicitud_contactos",
  {
    solicitudId: integer("solicitud_id")
      .notNull()
      .references(() => solicitudesTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.solicitudId, t.userId] })]
)

/** Tokens de recuperación de contraseña (se guarda sólo el hash SHA-256). */
export const passwordResetsTable = pgTable(
  "password_resets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique("uk_password_resets_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ix_password_resets_user").on(t.userId)]
)
