import { db } from "#database/connection.ts"
import {
  anunciosTable,
  especiesTable,
  fincasTable,
  razasTable,
  subastaLotesTable,
  subastasTable,
  usersTable,
} from "#database/schemas/index.ts"
import { anuncioCardColumns } from "#modules/anuncios/queries.ts"
import type { SubastaStatus } from "@workspace/shared"
import { asc, eq, sql } from "drizzle-orm"

/** "programada" se convierte en "en_vivo" o "finalizada" según la hora actual. */
export function effectiveStatus(
  s: { status: SubastaStatus; startsAt: Date; endsAt: Date },
  now = new Date()
): SubastaStatus {
  if (s.status !== "programada") return s.status
  if (now < s.startsAt) return "programada"
  if (now < s.endsAt) return "en_vivo"
  return "finalizada"
}

export const subastaCardColumns = {
  id: subastasTable.id,
  slug: subastasTable.slug,
  title: subastasTable.title,
  description: subastasTable.description,
  status: subastasTable.status,
  startsAt: subastasTable.startsAt,
  endsAt: subastasTable.endsAt,
  fincaId: subastasTable.fincaId,
  fincaName: fincasTable.name,
  fincaSlug: fincasTable.slug,
  estado: fincasTable.estado,
  ownerName: usersTable.name,
  lotesCount: sql<number>`(
    select count(*)::int from subasta_lotes l where l.subasta_id = "subastas"."id"
  )`,
  coverUrl: sql<string | null>`(
    select m.url from subasta_lotes l
    join anuncio_media m on m.anuncio_id = l.anuncio_id
    where l.subasta_id = "subastas"."id"
    order by l.orden asc, m.sort_order asc limit 1
  )`,
}

export function subastaCardQuery() {
  return db
    .select(subastaCardColumns)
    .from(subastasTable)
    .innerJoin(fincasTable, eq(fincasTable.id, subastasTable.fincaId))
    .innerJoin(usersTable, eq(usersTable.id, subastasTable.ownerId))
}

/** Normaliza una fila: expone el estado efectivo y conserva el guardado como rawStatus. */
export function withEffectiveStatus<T extends { status: SubastaStatus; startsAt: Date; endsAt: Date }>(
  row: T
) {
  return { ...row, rawStatus: row.status, status: effectiveStatus(row) }
}

/** Lotes con su anuncio, mejor puja y (opcional, sólo para el dueño) el mejor postor. */
export async function getLotes(subastaId: number, includeBidder = false) {
  const rows = await db
    .select({
      id: subastaLotesTable.id,
      orden: subastaLotesTable.orden,
      precioBaseUsd: subastaLotesTable.precioBaseUsd,
      incrementoUsd: subastaLotesTable.incrementoUsd,
      mejorPujaUsd: sql<number | null>`(
        select max(p.monto_usd)::float8 from pujas p where p.lote_id = "subasta_lotes"."id"
      )`,
      pujasCount: sql<number>`(
        select count(*)::int from pujas p where p.lote_id = "subasta_lotes"."id"
      )`,
      mejorPostor: sql<string | null>`(
        select u.name || ' · ' || coalesce(u.phone, u.email) from pujas p
        join users u on u.id = p.user_id
        where p.lote_id = "subasta_lotes"."id"
        order by p.monto_usd desc, p.created_at asc limit 1
      )`,
      anuncio: anuncioCardColumns,
    })
    .from(subastaLotesTable)
    .innerJoin(anunciosTable, eq(anunciosTable.id, subastaLotesTable.anuncioId))
    .leftJoin(especiesTable, eq(especiesTable.id, anunciosTable.especieId))
    .leftJoin(razasTable, eq(razasTable.id, anunciosTable.razaId))
    .leftJoin(fincasTable, eq(fincasTable.id, anunciosTable.fincaId))
    .where(eq(subastaLotesTable.subastaId, subastaId))
    .orderBy(asc(subastaLotesTable.orden))

  return rows.map(({ mejorPostor, ...l }) => ({
    ...l,
    minimoSiguienteUsd:
      l.mejorPujaUsd !== null ? l.mejorPujaUsd + l.incrementoUsd : l.precioBaseUsd,
    ...(includeBidder ? { mejorPostor } : {}),
  }))
}
