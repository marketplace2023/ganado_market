import type { ValidationTargets } from "hono"
import { validator } from "hono/validator"
import type { z } from "zod"
import { HttpError, issuesToErrors } from "./errors.ts"

/** Valida json/query/param con un schema zod y lanza 400 con errores por campo. */
export const validate = <Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema
) =>
  validator(target, (value) => {
    const result = schema.safeParse(value)
    if (!result.success) {
      throw new HttpError(400, "Datos inválidos", issuesToErrors(result.error.issues))
    }
    return result.data as z.output<Schema>
  })
