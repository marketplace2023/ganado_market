import type { ModalidadPrecio, SolicitudStatus, Urgencia } from "@workspace/shared"
import {
  foreignKey,
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
  "livestock_purchase_request",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    especieId: integer("especie_id"),
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
  (t) => [
    foreignKey({
      name: "solicitudes_user_id_users_id_fk",
      columns: [t.userId],
      foreignColumns: [usersTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "solicitudes_especie_id_especies_id_fk",
      columns: [t.especieId],
      foreignColumns: [especiesTable.id],
    }).onDelete("set null"),
    index("ix_solicitudes_status").on(t.status, t.expiresAt), index("ix_solicitudes_user").on(t.userId),
  ]
)

/** Qué ganaderos vieron el contacto de una solicitud (el comprador ve cuántos se interesaron). */
export const solicitudContactosTable = pgTable(
  "livestock_purchase_request_contact",
  {
    solicitudId: integer("solicitud_id").notNull(),
    userId: integer("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "solicitud_contactos_solicitud_id_solicitudes_id_fk",
      columns: [t.solicitudId],
      foreignColumns: [solicitudesTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "solicitud_contactos_user_id_users_id_fk",
      columns: [t.userId],
      foreignColumns: [usersTable.id],
    }).onDelete("cascade"),
    primaryKey({ name: "solicitud_contactos_solicitud_id_user_id_pk", columns: [t.solicitudId, t.userId] }),
  ]
)

/** Tokens de recuperación de contraseña (se guarda sólo el hash SHA-256). */
export const passwordResetsTable = pgTable(
  "livestock_password_reset",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique("uk_password_resets_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "password_resets_user_id_users_id_fk",
      columns: [t.userId],
      foreignColumns: [usersTable.id],
    }).onDelete("cascade"),
    index("ix_password_resets_user").on(t.userId),
  ]
)
