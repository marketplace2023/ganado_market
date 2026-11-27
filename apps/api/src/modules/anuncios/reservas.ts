import { db, type Transaction } from "#database/connection.ts"
import {
  anunciosTable,
  pujasTable,
  reservasAnuncioTable,
  subastaLotesTable,
  subastasTable,
} from "#database/schemas/index.ts"
import { conflict, fieldError, notFound } from "#modules/shared/http/errors.ts"
import type { ReservaAnuncio, ReservaAnuncioDto } from "@workspace/shared"
import { and, eq, gt, isNull, lte, sql, type SQL } from "drizzle-orm"

export function reservaVigenteEn(anuncioId: SQL) {
  return sql<boolean>`exists (
    select 1 from ${reservasAnuncioTable} r
    where r.anuncio_id = ${anuncioId}
      and r.ended_at is null and r.expires_at > statement_timestamp()
  )`
}

export const anuncioReservado = reservaVigenteEn(sql`${anunciosTable}."id"`)
export const anuncioDisponible = and(eq(anunciosTable.status, "publicado"), sql`not ${anuncioReservado}`)!

export const ultimaReservaAnuncio = sql<ReservaAnuncio | null>`(
  select jsonb_build_object(
    'id', r.id, 'cantidad', r.cantidad, 'precioUsd', r.precio_usd,
    'modalidadPrecio', r.modalidad_precio, 'expiresAt', r.expires_at,
    'resultado', coalesce(r.resultado, case when r.expires_at <= statement_timestamp() then 'vencida' end)
  )
  from ${reservasAnuncioTable} r where r.anuncio_id = ${anunciosTable}."id"
  order by r.id desc limit 1
)`

export async function reservaActiva(tx: Transaction, anuncioId: number) {
  const [reserva] = await tx
    .select({ id: reservasAnuncioTable.id })
    .from(reservasAnuncioTable)
    .where(
      and(
        eq(reservasAnuncioTable.anuncioId, anuncioId),
        isNull(reservasAnuncioTable.endedAt),
        gt(reservasAnuncioTable.expiresAt, sql`statement_timestamp()`)
      )
    )
  return reserva
}

/** Estas escrituras se hacen después de bloquear el anuncio correspondiente. */
export async function cerrarReservaVigente(
  tx: Transaction,
  anuncioId: number,
  resultado: "vendida" | "liberada" | "retirada",
  reservaId?: number
) {
  const [reserva] = await tx
    .update(reservasAnuncioTable)
    .set({ resultado, endedAt: sql`statement_timestamp()` })
    .where(
      and(
        eq(reservasAnuncioTable.anuncioId, anuncioId),
        reservaId === undefined ? undefined : eq(reservasAnuncioTable.id, reservaId),
        isNull(reservasAnuncioTable.endedAt),
        gt(reservasAnuncioTable.expiresAt, sql`statement_timestamp()`)
      )
    )
    .returning({ id: reservasAnuncioTable.id })
  return reserva
}

export async function crearReserva(anuncioId: number, ownerId: number, dto: ReservaAnuncioDto) {
  return db.transaction(async (tx) => {
    const [anuncio] = await tx
      .select({ status: anunciosTable.status, tipo: anunciosTable.tipo, cantidad: anunciosTable.cantidad })
      .from(anunciosTable)
      .where(and(eq(anunciosTable.id, anuncioId), eq(anunciosTable.ownerId, ownerId)))
      .for("update")
    if (!anuncio) throw notFound("Anuncio no encontrado")

    const expiresAt = new Date(dto.expiresAt)
    const [previa] = await tx
      .select({
        id: reservasAnuncioTable.id,
        precioUsd: reservasAnuncioTable.precioUsd,
        modalidadPrecio: reservasAnuncioTable.modalidadPrecio,
        expiresAt: reservasAnuncioTable.expiresAt,
      })
      .from(reservasAnuncioTable)
      .where(and(eq(reservasAnuncioTable.anuncioId, anuncioId), eq(reservasAnuncioTable.solicitudId, dto.solicitudId)))
    if (previa) {
      if (
        previa.precioUsd !== dto.precioUsd ||
        previa.modalidadPrecio !== dto.modalidadPrecio ||
        previa.expiresAt.getTime() !== expiresAt.getTime()
      ) {
        throw conflict("Esta solicitud ya se usó con otras condiciones")
      }
      return { id: previa.id }
    }

    if (anuncio.status !== "publicado" || anuncio.tipo !== "lote") {
      throw conflict("Solo se pueden reservar lotes publicados")
    }
    if (await reservaActiva(tx, anuncioId)) throw conflict("El lote ya tiene una reserva vigente")

    const [remate] = await tx
      .select({ title: subastasTable.title })
      .from(subastaLotesTable)
      .innerJoin(subastasTable, eq(subastasTable.id, subastaLotesTable.subastaId))
      .where(
        and(
          eq(subastaLotesTable.anuncioId, anuncioId),
          sql`(
            ${subastasTable.status} in ('borrador', 'pendiente')
            or (${subastasTable.status} = 'programada' and ${subastasTable.endsAt} > statement_timestamp())
            or (${subastasTable.status} in ('programada', 'finalizada') and exists (
              select 1 from ${pujasTable} p where p.lote_id = ${subastaLotesTable}."id"
            ))
          )`
        )
      )
      .limit(1)
    if (remate) throw conflict(`El lote está vinculado al remate «${remate.title}». Revisa ese remate antes de reservarlo.`)

    const { rows: [plazo] } = await tx.execute<{ futura: boolean }>(
      sql`select ${expiresAt.toISOString()}::timestamptz > statement_timestamp() as futura`
    )
    if (!plazo.futura) throw fieldError("expiresAt", "Elige una fecha y hora futuras")

    await tx
      .update(reservasAnuncioTable)
      .set({ resultado: "vencida", endedAt: reservasAnuncioTable.expiresAt })
      .where(
        and(
          eq(reservasAnuncioTable.anuncioId, anuncioId),
          isNull(reservasAnuncioTable.endedAt),
          lte(reservasAnuncioTable.expiresAt, sql`statement_timestamp()`)
        )
      )

    const [reserva] = await tx
      .insert(reservasAnuncioTable)
      .values({
        anuncioId,
        solicitudId: dto.solicitudId,
        cantidad: anuncio.cantidad,
        precioUsd: dto.precioUsd,
        modalidadPrecio: dto.modalidadPrecio,
        createdAt: sql`statement_timestamp()`,
        expiresAt,
      })
      .returning({ id: reservasAnuncioTable.id })
      .catch(() => {
        // El error original de Drizzle incluye el precio pactado en los parámetros SQL.
        throw new Error(`No se pudo guardar la reserva del anuncio ${anuncioId}`)
      })
    return reserva
  })
}

export async function liberarReserva(anuncioId: number, reservaId: number, ownerId: number) {
  return db.transaction(async (tx) => {
    const [anuncio] = await tx
      .select({ id: anunciosTable.id })
      .from(anunciosTable)
      .where(and(eq(anunciosTable.id, anuncioId), eq(anunciosTable.ownerId, ownerId)))
      .for("update")
    if (!anuncio) throw notFound("Anuncio no encontrado")
    const [reserva] = await tx
      .select({ resultado: reservasAnuncioTable.resultado })
      .from(reservasAnuncioTable)
      .where(and(eq(reservasAnuncioTable.id, reservaId), eq(reservasAnuncioTable.anuncioId, anuncioId)))
    if (!reserva) throw notFound("Reserva no encontrada")
    if (reserva.resultado === "liberada") return
    if (!(await cerrarReservaVigente(tx, anuncioId, "liberada", reservaId))) {
      throw conflict("Esta reserva ya no está vigente")
    }
  })
}
