import { useQuery } from "@tanstack/react-query"
import type { AnuncioCard } from "@workspace/shared"
import { EmptyState } from "@workspace/ui/components/dashboard-shell"
import { Heart } from "lucide-react"
import { Link, Navigate } from "react-router"
import { AnuncioGrid, AnuncioGridSkeleton } from "@/components/anuncio-card"
import { api, useAuth } from "@/lib/api"

export function FavoritosPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ["favoritos", "list", user?.id],
    queryFn: () => api.get<AnuncioCard[]>("/favoritos"),
    enabled: Boolean(user),
  })
  if (!authLoading && !user) return <Navigate to="/ingresar" state={{ from: "/favoritos" }} replace />

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Mis favoritos</h1>
      {isLoading || authLoading ? (
        <AnuncioGridSkeleton count={4} />
      ) : data?.length ? (
        <AnuncioGrid items={data} />
      ) : (
        <EmptyState
          icon={Heart}
          title="Aún no guardas anuncios"
          description="Toca el corazón en cualquier anuncio para guardarlo aquí."
          action={<Link to="/ganado" className="text-sm font-medium text-primary hover:underline">Explorar ganado</Link>}
        />
      )}
    </div>
  )
}
