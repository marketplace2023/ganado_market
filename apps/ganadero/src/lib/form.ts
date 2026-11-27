import { ApiError, issuesToFieldErrors } from "@workspace/shared"
import { useState } from "react"
import { toast } from "sonner"
import type { z } from "zod"

/**
 * Valida con el mismo schema zod que usa el API (de @workspace/shared) y,
 * si el servidor responde 400, pinta sus errores por campo.
 */
export function useSchemaForm<S extends z.ZodType>(schema: S) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(values: unknown): z.output<S> | null {
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      setErrors(issuesToFieldErrors(parsed.error.issues))
      toast.error("Revisa los campos marcados")
      return null
    }
    setErrors({})
    return parsed.data
  }

  function onServerError(err: unknown) {
    if (err instanceof ApiError && Object.keys(err.errors).length) setErrors(err.fieldErrors())
    toast.error(err instanceof Error ? err.message : "Ocurrió un error")
  }

  /** Quita el error de un campo cuando el usuario lo edita. */
  function clear(field: string) {
    setErrors((e) => {
      if (!(field in e)) return e
      const { [field]: _removed, ...rest } = e
      return rest
    })
  }

  return { errors, validate, onServerError, clear }
}
