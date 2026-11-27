/**
 * Cliente HTTP mínimo (fetch) usado por web, ganadero y admin.
 * Cada app llama al API vía `/api/*` (proxy de Vite en dev, redirect de Netlify en prod),
 * así no hay problemas de CORS y el token viaja como Bearer.
 */

export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }

  /** Primer mensaje de error de un campo, útil para formularios. */
  field(name: string) {
    return this.errors[name]?.[0]
  }

  /** { campo: primerMensaje } para pintar errores del servidor en un formulario. */
  fieldErrors() {
    return Object.fromEntries(Object.entries(this.errors).map(([k, v]) => [k, v[0] ?? ""]))
  }
}

type ClientOptions = {
  baseUrl?: string
  /** Clave de localStorage donde se guarda el JWT (cada app usa la suya). */
  tokenKey: string
  onUnauthorized?: () => void
}

export function createApiClient({ baseUrl = "/api", tokenKey, onUnauthorized }: ClientOptions) {
  const storage = typeof window !== "undefined" ? window.localStorage : undefined

  const token = {
    get: () => {
      try {
        return storage?.getItem(tokenKey) ?? null
      } catch {
        return null
      }
    },
    set: (value: string) => {
      try {
        storage?.setItem(tokenKey, value)
      } catch {
        /* almacenamiento no disponible */
      }
    },
    clear: () => {
      try {
        storage?.removeItem(tokenKey)
      } catch {
        /* almacenamiento no disponible */
      }
    },
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const t = token.get()
    const isForm = typeof FormData !== "undefined" && body instanceof FormData
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    })

    if (res.status === 401 && t) {
      token.clear()
      onUnauthorized?.()
    }

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        message?: string
        errors?: Record<string, string[]>
      }
      const firstFieldError = data.errors ? Object.values(data.errors)[0]?.[0] : undefined
      throw new ApiError(
        res.status,
        firstFieldError ?? data.message ?? `Error ${res.status}`,
        data.errors ?? {}
      )
    }

    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  return {
    token,
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
    put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
    patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
    del: <T>(path: string) => request<T>("DELETE", path),
    upload: (file: File) => {
      const form = new FormData()
      form.append("file", file)
      return request<{ url: string }>("POST", "/media/upload", form)
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

/** Convierte un objeto de filtros en querystring, omitiendo vacíos. */
export function toQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue
    qs.set(k, String(v))
  }
  const s = qs.toString()
  return s ? `?${s}` : ""
}
