import { db } from "#database/connection.ts"
import { anunciosTable, pujasTable, subastaLotesTable, subastasTable } from "#database/schemas/index.ts"
import { badRequest, forbidden, notFound } from "#modules/shared/http/errors.ts"
import { formatUsd } from "@workspace/shared"
import { eq, sql } from "drizzle-orm"
import { effectiveStatus } from "../queries.ts"

/** Si entra una puja en los últimos 2 minutos, el cierre se extiende 2 minutos (anti-francotirador). */
const EXTENSION_MS = 2 * 60 * 1000

export async function placeBid(loteId: number, userId: number, montoUsd: number) {
  return db.transaction(async (tx) => {
    // Bloquea el lote para serializar pujas concurrentes sobre el mismo lote.
    const [lote] = await tx
      .select({
        id: subastaLotesTable.id,
        subastaId: subastaLotesTable.subastaId,
        precioBaseUsd: subastaLotesTable.precioBaseUsd,
        incrementoUsd: subastaLotesTable.incrementoUsd,
        ownerId: anunciosTable.ownerId,
      })
      .from(subastaLotesTable)
      .innerJoin(anunciosTable, eq(anunciosTable.id, subastaLotesTable.anuncioId))
      .where(eq(subastaLotesTable.id, loteId))
      .for("update", { of: subastaLotesTable })
    if (!lote) throw notFound("Lote no encontrado")
    if (lote.ownerId === userId) throw forbidden("No puedes pujar en tus propios lotes")

    const [subasta] = await tx
      .select({
        status: subastasTable.status,
        startsAt: subastasTable.startsAt,
        endsAt: subastasTable.endsAt,
      })
      .from(subastasTable)
      .where(eq(subastasTable.id, lote.subastaId))
    const now = new Date()
    if (!subasta || effectiveStatus(subasta, now) !== "en_vivo") {
      throw badRequest("La subasta no está en vivo")
    }

    const [{ mejor }] = await tx
      .select({ mejor: sql<number | null>`max(${pujasTable.montoUsd})::float8` })
      .from(pujasTable)
      .where(eq(pujasTable.loteId, loteId))
    const minimo = mejor !== null ? mejor + lote.incrementoUsd : lote.precioBaseUsd
    if (montoUsd < minimo) {
      throw badRequest(`La puja mínima es ${formatUsd(minimo)}`, {
        montoUsd: [`La puja mínima es ${formatUsd(minimo)}`],
      })
    }

    const [puja] = await tx
      .insert(pujasTable)
      .values({ loteId, userId, montoUsd })
      .returning({ id: pujasTable.id, montoUsd: pujasTable.montoUsd, createdAt: pujasTable.createdAt })

    let endsAt = subasta.endsAt
    if (subasta.endsAt.getTime() - now.getTime() < EXTENSION_MS) {
      endsAt = new Date(now.getTime() + EXTENSION_MS)
      await tx.update(subastasTable).set({ endsAt }).where(eq(subastasTable.id, lote.subastaId))
    }

    return { ...puja, endsAt, minimoSiguienteUsd: montoUsd + lote.incrementoUsd }
  })
}
