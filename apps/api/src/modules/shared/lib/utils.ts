import { slugify } from "@workspace/shared"
import bcrypt from "bcryptjs"

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10)
export const checkPassword = (plain: string, hashed: string) => bcrypt.compare(plain, hashed)

/** Slug legible + sufijo aleatorio para evitar colisiones sin consultar la BD. */
export function uniqueSlug(text: string) {
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${slugify(text) || "item"}-${suffix}`
}

export function paramId(raw: string) {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : -1
}

export function pagination(page: number, limit: number) {
  return { limit, offset: (page - 1) * limit }
}

export const escapeLike = (value: string) => value.replace(/[\\%_]/g, (character) => `\\${character}`)
