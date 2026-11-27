import { db, type Transaction } from "#database/connection.ts"
import { anuncioMediaTable, anunciosTable, fincasTable, razasTable } from "#database/schemas/index.ts"
import { conflict, fieldError, notFound } from "#modules/shared/http/errors.ts"
import { uniqueSlug } from "#modules/shared/lib/utils.ts"
import type { AnuncioDto, AnuncioStatus } from "@workspace/shared"
import { and, eq } from "drizzle-orm"
import { reservaActiva } from "../reservas.ts"

async function assertOwnership(ownerId: number, dto: AnuncioDto, connection: typeof db | Transaction = db) {
  const [finca] = await connection
    .select({ id: fincasTable.id })
    .from(fincasTable)
    .where(and(eq(fincasTable.id, dto.fincaId), eq(fincasTable.ownerId, ownerId)))
  if (!finca) throw fieldError("fincaId", "Selecciona una de tus fincas")

  if (dto.razaId) {
    const [raza] = await connection
      .select({ especieId: razasTable.especieId })
      .from(razasTable)
      .where(eq(razasTable.id, dto.razaId))
    if (!raza || raza.especieId !== dto.especieId) {
      throw fieldError("razaId", "La raza no corresponde a la especie seleccionada")
    }
  }
}

function toColumns(dto: AnuncioDto) {
  const { media: _m, ...rest } = dto
  return {
    ...rest,
    razaId: dto.razaId ?? null,
    categoriaAnimal: dto.categoriaAnimal ?? null,
    edadMeses: dto.edadMeses ?? null,
    pesoPromedioKg: dto.pesoPromedioKg ?? null,
    videoUrl: dto.videoUrl ?? null,
  }
}

export async function createAnuncio(ownerId: number, dto: AnuncioDto, submit: boolean) {
  await assertOwnership(ownerId, dto)
  return db.transaction(async (tx) => {
    const [anuncio] = await tx
      .insert(anunciosTable)
      .values({
        ...toColumns(dto),
        ownerId,
        slug: uniqueSlug(dto.title),
        status: submit ? "pendiente" : "borrador",
      })
      .returning({ id: anunciosTable.id, slug: anunciosTable.slug, status: anunciosTable.status })
    if (dto.media.length) {
      await tx
        .insert(anuncioMediaTable)
        .values(dto.media.map((url, i) => ({ anuncioId: anuncio.id, url, sortOrder: i })))
    }
    return anuncio
  })
}

/**
 * Editar un anuncio ya publicado lo devuelve a revisión: así el admin modera cambios de precio,
 * fotos o descripción. Un borrador sigue siendo borrador salvo que se envíe (`submit`).
 */
export async function updateAnuncio(ownerId: number, id: number, dto: AnuncioDto, submit: boolean) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: anunciosTable.status })
      .from(anunciosTable)
      .where(and(eq(anunciosTable.id, id), eq(anunciosTable.ownerId, ownerId)))
      .for("update")
    if (!current) throw notFound("Anuncio no encontrado")
    if (await reservaActiva(tx, id)) throw conflict("Libera la reserva antes de editar el anuncio")
    await assertOwnership(ownerId, dto, tx)

    const status: AnuncioStatus =
      current.status === "vendido"
        ? "vendido"
        : current.status === "borrador" && !submit
          ? "borrador"
          : "pendiente"

    const [anuncio] = await tx
      .update(anunciosTable)
      .set({ ...toColumns(dto), status, rejectionReason: null })
      .where(eq(anunciosTable.id, id))
      .returning({ id: anunciosTable.id, slug: anunciosTable.slug, status: anunciosTable.status })
    await tx.delete(anuncioMediaTable).where(eq(anuncioMediaTable.anuncioId, id))
    if (dto.media.length) {
      await tx
        .insert(anuncioMediaTable)
        .values(dto.media.map((url, i) => ({ anuncioId: id, url, sortOrder: i })))
    }
    return anuncio
  })
}
