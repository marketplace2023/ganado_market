import * as React from "react"
import {
  ApiError,
  type ApiClient,
  type AuthResponse,
  type AuthUser,
  type LoginDto,
  type RegisterDto,
  type RoleName,
} from "@workspace/shared"

type AuthState = {
  user: AuthUser | null
  isLoading: boolean
  login: (dto: LoginDto) => Promise<AuthUser>
  register: (dto: RegisterDto) => Promise<AuthUser>
  logout: () => void
  setUser: (user: AuthUser) => void
}

/**
 * Crea el contexto de sesión de una app. `requiredRole` restringe quién puede iniciar sesión
 * (p. ej. el panel admin sólo acepta "admin"; el panel ganadero, "ganadero" o "admin").
 */
export function createAuth(api: ApiClient, requiredRole?: RoleName) {
  const Ctx = React.createContext<AuthState | null>(null)

  const assertRole = (user: AuthUser) => {
    if (!requiredRole) return
    const ok =
      user.roles.includes(requiredRole) || (requiredRole !== "admin" && user.roles.includes("admin"))
    if (!ok) {
      throw new ApiError(403, "Esta cuenta no tiene acceso a este panel", {
        email: ["Esta cuenta no tiene acceso a este panel"],
      })
    }
  }

  function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = React.useState(() => Boolean(api.token.get()))

    React.useEffect(() => {
      if (!api.token.get()) return
      api
        .get<AuthUser>("/auth/me")
        .then((me) => {
          assertRole(me)
          setUser(me)
        })
        .catch(() => api.token.clear())
        .finally(() => setIsLoading(false))
    }, [])

    const value = React.useMemo<AuthState>(
      () => ({
        user,
        isLoading,
        setUser,
        async login(dto) {
          const res = await api.post<AuthResponse>("/auth/login", dto)
          assertRole(res.user)
          api.token.set(res.token)
          setUser(res.user)
          return res.user
        },
        async register(dto) {
          const res = await api.post<AuthResponse>("/auth/register", dto)
          api.token.set(res.token)
          setUser(res.user)
          return res.user
        },
        logout() {
          api.token.clear()
          setUser(null)
        },
      }),
      [user, isLoading]
    )

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
  }

  function useAuth() {
    const ctx = React.useContext(Ctx)
    if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>")
    return ctx
  }

  return { AuthProvider, useAuth }
}
