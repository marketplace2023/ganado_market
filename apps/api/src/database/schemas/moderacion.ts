import type { DenunciaMotivo, DenunciaStatus } from "@workspace/shared"
import { foreignKey, index, integer, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { anunciosTable } from "./anuncios.ts"
import { usersTable } from "./users.ts"

/** Denuncias de anuncios (de usuarios con sesión o visitantes). */
export const denunciasTable = pgTable(
  "livestock_listing_report",
  {
    id: serial("id").primaryKey(),
    anuncioId: integer("anuncio_id").notNull(),
    userId: integer("user_id"),
    motivo: varchar("motivo", { length: 30 }).notNull().$type<DenunciaMotivo>(),
    detalle: text("detalle").notNull().default(""),
    status: varchar("status", { length: 20 }).notNull().default("pendiente").$type<DenunciaStatus>(),
    resolvedBy: integer("resolved_by"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "denuncias_anuncio_id_anuncios_id_fk",
      columns: [t.anuncioId],
      foreignColumns: [anunciosTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "denuncias_user_id_users_id_fk",
      columns: [t.userId],
      foreignColumns: [usersTable.id],
    }).onDelete("set null"),
    foreignKey({
      name: "denuncias_resolved_by_users_id_fk",
      columns: [t.resolvedBy],
      foreignColumns: [usersTable.id],
    }).onDelete("set null"),
    index("ix_denuncias_status").on(t.status),
    // Un usuario con sesión sólo puede denunciar una vez cada anuncio.
    uniqueIndex("uk_denuncias_user_anuncio").on(t.anuncioId, t.userId),
  ]
)

/** Historial de acciones del admin (quién hizo qué y cuándo). */
export const auditLogTable = pgTable(
  "livestock_audit_log",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id"),
    /** Copia del nombre/correo para que el historial sobreviva si se elimina la cuenta. */
    adminName: varchar("admin_name", { length: 100 }).notNull(),
    adminEmail: varchar("admin_email", { length: 255 }).notNull(),
    action: varchar("action", { length: 40 }).notNull(),
    entityType: varchar("entity_type", { length: 30 }).notNull(),
    entityId: integer("entity_id"),
    summary: varchar("summary", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "audit_log_admin_id_users_id_fk",
      columns: [t.adminId],
      foreignColumns: [usersTable.id],
    }).onDelete("set null"),
    index("ix_audit_created").on(t.createdAt), index("ix_audit_entity").on(t.entityType, t.entityId),
  ]
)
