import type {
  AnuncioStatus,
  CategoriaAnimal,
  ConsultaStatus,
  ModalidadPrecio,
  ReservaAnuncio,
  Sexo,
  TipoAnuncio,
} from "@workspace/shared"
import { sql } from "drizzle-orm"
import {
  foreignKey,
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"
import { especiesTable, razasTable } from "./catalogo.ts"
import { fincasTable } from "./fincas.ts"
import { usersTable } from "./users.ts"

export const anunciosTable = pgTable(
  "livestock_listing",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id").notNull(),
    fincaId: integer("finca_id").notNull(),
    especieId: integer("especie_id").notNull(),
    razaId: integer("raza_id"),
    title: varchar("title", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull().unique("uk_anuncios_slug"),
    description: text("description").notNull().default(""),
    tipo: varchar("tipo", { length: 20 }).notNull().$type<TipoAnuncio>(),
    categoriaAnimal: varchar("categoria_animal", { length: 20 }).$type<CategoriaAnimal>(),
    sexo: varchar("sexo", { length: 10 }).notNull().$type<Sexo>(),
    cantidad: integer("cantidad").notNull().default(1),
    edadMeses: integer("edad_meses"),
    pesoPromedioKg: numeric("peso_promedio_kg", { precision: 8, scale: 2, mode: "number" }),
    precioUsd: numeric("precio_usd", { precision: 14, scale: 2, mode: "number" }).notNull(),
    modalidadPrecio: varchar("modalidad_precio", { length: 20 }).notNull().$type<ModalidadPrecio>(),
    negociable: boolean("negociable").notNull().default(true),
    estado: varchar("estado", { length: 40 }).notNull(),
    municipio: varchar("municipio", { length: 120 }).notNull(),
    vacunaAftosa: boolean("vacuna_aftosa").notNull().default(false),
    vacunaBrucelosis: boolean("vacuna_brucelosis").notNull().default(false),
    guiaMovilizacion: boolean("guia_movilizacion").notNull().default(false),
    desparasitado: boolean("desparasitado").notNull().default(false),
    registroGenealogico: boolean("registro_genealogico").notNull().default(false),
    videoUrl: varchar("video_url", { length: 500 }),
    status: varchar("status", { length: 20 }).notNull().default("borrador").$type<AnuncioStatus>(),
    rejectionReason: varchar("rejection_reason", { length: 500 }),
    isFeatured: boolean("is_featured").notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    whatsappClicks: integer("whatsapp_clicks").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    foreignKey({
      name: "anuncios_owner_id_users_id_fk",
      columns: [t.ownerId],
      foreignColumns: [usersTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "anuncios_finca_id_fincas_id_fk",
      columns: [t.fincaId],
      foreignColumns: [fincasTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "anuncios_especie_id_especies_id_fk",
      columns: [t.especieId],
      foreignColumns: [especiesTable.id],
    }),
    foreignKey({
      name: "anuncios_raza_id_razas_id_fk",
      columns: [t.razaId],
      foreignColumns: [razasTable.id],
    }).onDelete("set null"),
    index("ix_anuncios_status").on(t.status),
    index("ix_anuncios_estado").on(t.estado),
    index("ix_anuncios_especie").on(t.especieId),
    index("ix_anuncios_owner").on(t.ownerId),
    index("ix_anuncios_finca").on(t.fincaId),
  ]
)

export const reservasAnuncioTable = pgTable(
  "livestock_listing_reservation",
  {
    id: serial("id").primaryKey(),
    anuncioId: integer("anuncio_id").notNull(),
    solicitudId: uuid("solicitud_id").notNull(),
    cantidad: integer("cantidad").notNull(),
    precioUsd: numeric("precio_usd", { precision: 14, scale: 2, mode: "number" }).notNull(),
    modalidadPrecio: varchar("modalidad_precio", { length: 20 }).notNull().$type<ModalidadPrecio>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    resultado: varchar("resultado", { length: 20 }).$type<NonNullable<ReservaAnuncio["resultado"]>>(),
  },
  (t) => [
    foreignKey({
      name: "reservas_anuncio_anuncio_id_anuncios_id_fk",
      columns: [t.anuncioId],
      foreignColumns: [anunciosTable.id],
    }).onDelete("cascade"),
    uniqueIndex("uk_reservas_anuncio_solicitud").on(t.anuncioId, t.solicitudId),
    uniqueIndex("uk_reservas_anuncio_abierta").on(t.anuncioId).where(sql`${t.endedAt} is null`),
  ]
)

export const anuncioMediaTable = pgTable(
  "product_image",
  {
    id: serial("id").primaryKey(),
    anuncioId: integer("anuncio_id").notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    foreignKey({
      name: "anuncio_media_anuncio_id_anuncios_id_fk",
      columns: [t.anuncioId],
      foreignColumns: [anunciosTable.id],
    }).onDelete("cascade"),
    index("ix_anuncio_media_anuncio").on(t.anuncioId),
  ]
)

/** Consultas (leads) que un comprador envía al ganadero desde un anuncio. */
export const consultasTable = pgTable(
  "crm_lead",
  {
    id: serial("id").primaryKey(),
    anuncioId: integer("anuncio_id").notNull(),
    userId: integer("user_id"),
    name: varchar("name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }),
    message: text("message").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("nueva").$type<ConsultaStatus>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "consultas_anuncio_id_anuncios_id_fk",
      columns: [t.anuncioId],
      foreignColumns: [anunciosTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "consultas_user_id_users_id_fk",
      columns: [t.userId],
      foreignColumns: [usersTable.id],
    }).onDelete("set null"),
    index("ix_consultas_anuncio").on(t.anuncioId),
  ]
)

export const favoritosTable = pgTable(
  "product_wishlist",
  {
    userId: integer("user_id").notNull(),
    anuncioId: integer("anuncio_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "favoritos_user_id_users_id_fk",
      columns: [t.userId],
      foreignColumns: [usersTable.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "favoritos_anuncio_id_anuncios_id_fk",
      columns: [t.anuncioId],
      foreignColumns: [anunciosTable.id],
    }).onDelete("cascade"),
    primaryKey({ name: "favoritos_user_id_anuncio_id_pk", columns: [t.userId, t.anuncioId] }),
  ]
)
