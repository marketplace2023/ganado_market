import type { DenunciaMotivo, DenunciaStatus } from "@workspace/shared"
import { index, integer, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core"
import { anunciosTable } from "./anuncios.ts"
import { usersTable } from "./users.ts"

/** Denuncias de anuncios (de usuarios con sesión o visitantes). */
export const denunciasTable = pgTable(
  "denuncias",
  {
    id: serial("id").primaryKey(),
    anuncioId: integer("anuncio_id")
      .notNull()
      .references(() => anunciosTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    motivo: varchar("motivo", { length: 30 }).notNull().$type<DenunciaMotivo>(),
    detalle: text("detalle").notNull().default(""),
    status: varchar("status", { length: 20 }).notNull().default("pendiente").$type<DenunciaStatus>(),
    resolvedBy: integer("resolved_by").references(() => usersTable.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ix_denuncias_status").on(t.status),
    // Un usuario con sesión sólo puede denunciar una vez cada anuncio.
    uniqueIndex("uk_denuncias_user_anuncio").on(t.anuncioId, t.userId),
  ]
)

/** Historial de acciones del admin (quién hizo qué y cuándo). */
export const auditLogTable = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id").references(() => usersTable.id, { onDelete: "set null" }),
    /** Copia del nombre/correo para que el historial sobreviva si se elimina la cuenta. */
    adminName: varchar("admin_name", { length: 100 }).notNull(),
    adminEmail: varchar("admin_email", { length: 255 }).notNull(),
    action: varchar("action", { length: 40 }).notNull(),
    entityType: varchar("entity_type", { length: 30 }).notNull(),
    entityId: integer("entity_id"),
    summary: varchar("summary", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ix_audit_created").on(t.createdAt), index("ix_audit_entity").on(t.entityType, t.entityId)]
)
