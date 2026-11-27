import { createApiClient, type Especie, type PublicSettings } from "@workspace/shared"
import { createAuth } from "@workspace/ui/lib/auth"
import { useQuery } from "@tanstack/react-query"

export const api = createApiClient({ tokenKey: "gm_token" })
export const { AuthProvider, useAuth } = createAuth(api)

/** URL del panel del ganadero (otra app del monorepo). */
export const GANADERO_URL = import.meta.env.VITE_GANADERO_URL ?? "http://localhost:5174"

export const useEspecies = () =>
  useQuery({
    queryKey: ["especies"],
    queryFn: () => api.get<Especie[]>("/catalogo/especies"),
    staleTime: 60 * 60 * 1000,
  })

export const useSettings = () =>
  useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<PublicSettings>("/catalogo/settings"),
    staleTime: 10 * 60 * 1000,
  })
