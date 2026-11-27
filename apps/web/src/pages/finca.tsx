import { useQuery } from "@tanstack/react-query"
import {
  ApiError,
  estadoName,
  formatDate,
  formatNumber,
  whatsappUrl,
  type AnuncioCard,
  type FincaPublic,
  type Paginated,
} from "@workspace/shared"
import { buttonVariants } from "@workspace/ui/components/button"
import { EmptyState } from "@workspace/ui/components/dashboard-shell"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "cn"
import { BadgeCheck, Fence, MapPin, MessageCircle, PackageOpen, Tag } from "lucide-react"
import { useParams } from "react-router"
import { AnuncioGrid } from "@/components/anuncio-card"
import { MapaUbicacion } from "@/components/resultados-mapa"
import { api } from "@/lib/api"
import { puntoFinca } from "@/lib/ubicaciones"
import { NotFoundPage } from "./not-found"

export function FincaPage() {
  const { slug } = useParams()
  const finca = useQuery({
    queryKey: ["finca", slug],
    queryFn: () => api.get<FincaPublic & { anunciosCount: number }>(`/fincas/${slug}`),
    retry: false,
  })
  const anuncios = useQuery({
    queryKey: ["anuncios", "finca", slug],
    queryFn: () => api.get<Paginated<AnuncioCard>>(`/anuncios?finca=${slug}&limit=48&orden=recientes`),
  })

  if (finca.error instanceof ApiError && finca.error.status === 404) return <NotFoundPage />
  const f = finca.data
  if (!f) return <div className="mx-auto max-w-7xl px-4 py-8"><Skeleton className="h-48 rounded-xl" /></div>
  const wa = whatsappUrl(f.whatsapp, `Hola, vi la finca ${f.name} en GanadoMarket.`)

  return (
    <div>
      <div className="brand-surface relative h-44 sm:h-64">
        {f.coverUrl && <img src={f.coverUrl} alt="" className="size-full object-cover opacity-80" />}
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-12 flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
          <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-secondary text-3xl font-semibold text-secondary-foreground">
            {f.logoUrl ? <img src={f.logoUrl} alt="" className="size-full object-cover" /> : f.name[0]}
          </span>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {f.name}
              {f.verificada && <BadgeCheck className="size-5 text-sky-600" aria-label="Verificada" />}
            </h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{f.municipio}, {estadoName(f.estado)}</span>
              {f.hectareas && <span className="inline-flex items-center gap-1"><Fence className="size-3.5" />{formatNumber(f.hectareas)} ha</span>}
              {f.hierro && <span className="inline-flex items-center gap-1"><Tag className="size-3.5" />Hierro {f.hierro}</span>}
              <span>En GanadoMarket desde {formatDate(f.createdAt)}</span>
            </div>
          </div>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "lg" }), "bg-[#25D366] text-white hover:bg-[#1fb857]")}>
              <MessageCircle /> WhatsApp
            </a>
          )}
        </div>
        {f.coverUrl?.startsWith("/api/demo-images/") && (
          <p className="mt-2 text-xs text-muted-foreground">Portada ilustrativa de demostración</p>
        )}
        {f.descripcion && <p className="mt-6 max-w-3xl text-sm leading-relaxed text-foreground/85">{f.descripcion}</p>}
        <div className="mt-6">
          <MapaUbicacion punto={puntoFinca(f)} />
        </div>

        <h2 className="mt-10 mb-5 border-b pb-3 font-heading text-3xl font-semibold">
          Ganado publicado <span className="text-muted-foreground">({f.anunciosCount})</span>
        </h2>
        {anuncios.data?.items.length ? (
          <AnuncioGrid items={anuncios.data.items} />
        ) : (
          <EmptyState icon={PackageOpen} title="Esta finca no tiene anuncios activos" />
        )}
      </div>
    </div>
  )
}
