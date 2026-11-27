import { db } from "#database/connection.ts"
import {
  anuncioMediaTable,
  anunciosTable,
  especiesTable,
  fincasTable,
  razasTable,
  usersTable,
} from "#database/schemas/index.ts"
import { and, asc, desc, eq, ne, sql, type SQL } from "drizzle-orm"
import { anuncioDisponible, anuncioReservado } from "./reservas.ts"

/** Columnas de la tarjeta de anuncio (AnuncioCard) — reutilizadas en listados, subastas y favoritos. */
export const anuncioCardColumns = {
  id: anunciosTable.id,
  slug: anunciosTable.slug,
  title: anunciosTable.title,
  tipo: anunciosTable.tipo,
  sexo: anunciosTable.sexo,
  cantidad: anunciosTable.cantidad,
  categoriaAnimal: anunciosTable.categoriaAnimal,
  pesoPromedioKg: anunciosTable.pesoPromedioKg,
  precioUsd: anunciosTable.precioUsd,
  modalidadPrecio: anunciosTable.modalidadPrecio,
  negociable: anunciosTable.negociable,
  estado: anunciosTable.estado,
  municipio: anunciosTable.municipio,
  isFeatured: anunciosTable.isFeatured,
  guiaMovilizacion: anunciosTable.guiaMovilizacion,
  especieName: especiesTable.name,
  especieSlug: especiesTable.slug,
  razaName: razasTable.name,
  fincaName: fincasTable.name,
  fincaSlug: fincasTable.slug,
  fincaVerificada: sql<boolean>`coalesce(${fincasTable.verificacion} = 'verificada', false)`,
  thumbnailUrl: sql<string | null>`(
    select m.url from anuncio_media m
    where m.anuncio_id = "anuncios"."id"
    order by m.sort_order asc limit 1
  )`,
  publishedAt: anunciosTable.publishedAt,
  reservado: anuncioReservado,
}

/** Columnas extra para la vista del dueño / admin (AnuncioOwned). */
export const anuncioOwnedColumns = {
  ...anuncioCardColumns,
  status: anunciosTable.status,
  rejectionReason: anunciosTable.rejectionReason,
  viewCount: anunciosTable.viewCount,
  whatsappClicks: anunciosTable.whatsappClicks,
  consultasCount: sql<number>`(
    select count(*)::int from consultas c where c.anuncio_id = "anuncios"."id"
  )`,
  createdAt: anunciosTable.createdAt,
}

export function anuncioCardQuery() {
  return db
    .select(anuncioCardColumns)
    .from(anunciosTable)
    .leftJoin(especiesTable, eq(especiesTable.id, anunciosTable.especieId))
    .leftJoin(razasTable, eq(razasTable.id, anunciosTable.razaId))
    .leftJoin(fincasTable, eq(fincasTable.id, anunciosTable.fincaId))
}

export function anuncioOwnedQuery<Extra extends Record<string, SQL>>(extra?: Extra) {
  return db
    .select({ ...anuncioOwnedColumns, ownerName: usersTable.name, ownerEmail: usersTable.email, ...extra })
    .from(anunciosTable)
    .leftJoin(especiesTable, eq(especiesTable.id, anunciosTable.especieId))
    .leftJoin(razasTable, eq(razasTable.id, anunciosTable.razaId))
    .leftJoin(fincasTable, eq(fincasTable.id, anunciosTable.fincaId))
    .leftJoin(usersTable, eq(usersTable.id, anunciosTable.ownerId))
}

export function countAnuncios(where: SQL | undefined) {
  return db
    .select({ total: sql<number>`count(*)::int` })
    .from(anunciosTable)
    .leftJoin(especiesTable, eq(especiesTable.id, anunciosTable.especieId))
    .leftJoin(razasTable, eq(razasTable.id, anunciosTable.razaId))
    .leftJoin(fincasTable, eq(fincasTable.id, anunciosTable.fincaId))
    .where(where)
    .then((r) => r[0]?.total ?? 0)
}

/** Detalle completo (AnuncioDetail). `where` decide la visibilidad (público vs admin). */
export async function getAnuncioDetail(where: SQL) {
  const [row] = await db
    .select({
      ...anuncioCardColumns,
      status: anunciosTable.status,
      especieId: anunciosTable.especieId,
      description: anunciosTable.description,
      edadMeses: anunciosTable.edadMeses,
      vacunaAftosa: anunciosTable.vacunaAftosa,
      vacunaBrucelosis: anunciosTable.vacunaBrucelosis,
      desparasitado: anunciosTable.desparasitado,
      registroGenealogico: anunciosTable.registroGenealogico,
      videoUrl: anunciosTable.videoUrl,
      viewCount: anunciosTable.viewCount,
      finca: {
        id: fincasTable.id,
        name: fincasTable.name,
        slug: fincasTable.slug,
        estado: fincasTable.estado,
        municipio: fincasTable.municipio,
        descripcion: fincasTable.descripcion,
        hectareas: fincasTable.hectareas,
        hierro: fincasTable.hierro,
        logoUrl: fincasTable.logoUrl,
        coverUrl: fincasTable.coverUrl,
        whatsapp: fincasTable.whatsapp,
        verificada: sql<boolean>`${fincasTable.verificacion} = 'verificada'`,
        createdAt: fincasTable.createdAt,
      },
    })
    .from(anunciosTable)
    .leftJoin(especiesTable, eq(especiesTable.id, anunciosTable.especieId))
    .leftJoin(razasTable, eq(razasTable.id, anunciosTable.razaId))
    .innerJoin(fincasTable, eq(fincasTable.id, anunciosTable.fincaId))
    .where(where)
    .limit(1)

  if (!row) return null

  const [media, related] = await Promise.all([
    db
      .select({ id: anuncioMediaTable.id, url: anuncioMediaTable.url })
      .from(anuncioMediaTable)
      .where(eq(anuncioMediaTable.anuncioId, row.id))
      .orderBy(asc(anuncioMediaTable.sortOrder)),
    anuncioCardQuery()
      .where(
        and(
          anuncioDisponible,
          eq(anunciosTable.especieId, row.especieId),
          ne(anunciosTable.id, row.id)
        )
      )
      .orderBy(desc(anunciosTable.isFeatured), desc(anunciosTable.publishedAt))
      .limit(4),
  ])

  const { especieId: _e, ...rest } = row
  return { ...rest, media, related }
}
