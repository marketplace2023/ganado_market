import { useQuery } from "@tanstack/react-query"
import { ApiError, createApiClient, issuesToFieldErrors, type Especie } from "@workspace/shared"
import { createAuth } from "@workspace/ui/lib/auth"
import { useState } from "react"
import { toast } from "sonner"
import type { z } from "zod"

export const api = createApiClient({
  tokenKey: "gm_admin_token",
  onUnauthorized: () => window.location.assign("/login"),
})

/** Sólo cuentas con rol "admin". */
export const { AuthProvider, useAuth } = createAuth(api, "admin")

export const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:5173"

export const useEspecies = () =>
  useQuery({ queryKey: ["especies"], queryFn: () => api.get<Especie[]>("/catalogo/especies") })

export function useSchemaForm<S extends z.ZodType>(schema: S) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  return {
    errors,
    setErrors,
    validate(values: unknown): z.output<S> | null {
      const parsed = schema.safeParse(values)
      if (!parsed.success) {
        setErrors(issuesToFieldErrors(parsed.error.issues))
        return null
      }
      setErrors({})
      return parsed.data
    },
    onServerError(err: unknown) {
      if (err instanceof ApiError && Object.keys(err.errors).length) setErrors(err.fieldErrors())
      toast.error(err instanceof Error ? err.message : "Ocurrió un error")
    },
  }
}
