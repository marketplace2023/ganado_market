import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { HTTPException } from "hono/http-exception"
import type { z } from "zod"

/** Error HTTP con mensaje y errores por campo ({ campo: [mensajes] }), igual que en agro-backend. */
export class HttpError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message)
  }
}

export const notFound = (message = "Recurso no encontrado") => new HttpError(404, message)
export const forbidden = (message = "Acceso denegado") => new HttpError(403, message)
export const unauthorized = (message = "No autenticado") => new HttpError(401, message)
export const conflict = (message: string) => new HttpError(409, message)
export const badRequest = (message: string, errors?: Record<string, string[]>) =>
  new HttpError(400, message, errors)
export const fieldError = (field: string, message: string) =>
  new HttpError(400, message, { [field]: [message] })

export function issuesToErrors(issues: z.core.$ZodIssue[]) {
  const errors: Record<string, string[]> = {}
  for (const issue of issues) {
    const key = issue.path.join(".") || "_"
    ;(errors[key] ??= []).push(issue.message)
  }
  return errors
}

function isPgError(err: unknown): err is Error & { code: string; constraint?: string } {
  return err instanceof Error && typeof (err as { code?: unknown }).code === "string"
}

export function errorHandler(err: Error, c: Context) {
  if (err instanceof HttpError) {
    return c.json({ message: err.message, errors: err.errors }, err.status)
  }
  if (err instanceof HTTPException) {
    // 401 de hono/jwt (token ausente o inválido)
    return c.json({ message: err.status === 401 ? "No autenticado" : err.message }, err.status)
  }
  const cause = (err as { cause?: unknown }).cause
  const pgErr = isPgError(err) ? err : isPgError(cause) ? cause : null
  if (pgErr?.code === "23505") {
    return c.json({ message: "El registro ya existe", constraint: pgErr.constraint }, 409)
  }
  if (pgErr?.code === "23503") {
    return c.json({ message: "Referencia inválida" }, 400)
  }
  console.error(err)
  return c.json({ message: "Error interno del servidor" }, 500)
}
