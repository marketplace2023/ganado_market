import type { RoleName, UserStatus } from "@workspace/shared"
import { foreignKey, integer, pgTable, primaryKey, serial, timestamp, varchar } from "drizzle-orm/pg-core"

export const usersTable = pgTable("res_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique("uk_users_email"),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  documentType: varchar("document_type", { length: 10 }).$type<"cedula" | "rif">(),
  documentNumber: varchar("document_number", { length: 20 }).unique("uk_users_document"),
  status: varchar("status", { length: 20 }).notNull().default("activo").$type<UserStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const rolesTable = pgTable("res_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique("uk_roles_name").$type<RoleName>(),
  description: varchar("description", { length: 255 }).notNull(),
})

export const usersToRolesTable = pgTable(
  "res_groups_users_rel",
  {
    userId: integer("user_id").notNull(),
    roleId: integer("role_id").notNull(),
  },
  (t) => [
    foreignKey({
      name: "users_to_roles_user_id_users_id_fk",
      columns: [t.userId],
      foreignColumns: [usersTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "users_to_roles_role_id_roles_id_fk",
      columns: [t.roleId],
      foreignColumns: [rolesTable.id],
    }).onDelete("cascade"),
    primaryKey({ name: "users_to_roles_user_id_role_id_pk", columns: [t.userId, t.roleId] }),
  ]
)
