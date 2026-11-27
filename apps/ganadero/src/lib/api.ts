import { useQuery } from "@tanstack/react-query"
import { createApiClient, type Especie, type Finca } from "@workspace/shared"
import { createAuth } from "@workspace/ui/lib/auth"

export const api = createApiClient({
  tokenKey: "gm_ganadero_token",
  onUnauthorized: () => window.location.assign("/login"),
})

/** Sólo cuentas con rol "ganadero" (o admin) pueden entrar a este panel. */
export const { AuthProvider, useAuth } = createAuth(api, "ganadero")

/** URL del marketplace público, para enlazar "Ver anuncio publicado". */
export const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:5173"

export const useEspecies = () =>
  useQuery({
    queryKey: ["especies"],
    queryFn: () => api.get<Especie[]>("/catalogo/especies"),
    staleTime: 60 * 60 * 1000,
  })

export const useFincas = () =>
  useQuery({ queryKey: ["fincas"], queryFn: () => api.get<Finca[]>("/ganadero/fincas") })
