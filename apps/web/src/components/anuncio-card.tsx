import {
  CATEGORIA_ANIMAL_LABEL,
  TIPO_ANUNCIO_LABEL,
  estadoName,
  formatNumber,
  type AnuncioCard as AnuncioCardData,
} from "@workspace/shared"
import { cn } from "cn"
import { BadgeCheck, FileCheck2, Heart, MapPin } from "lucide-react"
import { Link } from "react-router"
import { useFavoritos } from "@/lib/favoritos"
import { AnimalPlaceholder } from "./animal-placeholder"
import { Precio } from "./precio"

export function AnuncioCard({ anuncio, onUbicar }: { anuncio: AnuncioCardData; onUbicar?: () => void }) {
  const { isFavorito, toggle } = useFavoritos()
  const fav = isFavorito(anuncio.id)
  const detalle = [
    anuncio.razaName,
    anuncio.categoriaAnimal ? CATEGORIA_ANIMAL_LABEL[anuncio.categoriaAnimal] : null,
    anuncio.pesoPromedioKg ? `${formatNumber(anuncio.pesoPromedioKg)} kg prom.` : null,
  ].filter(Boolean)

  return (
    <article className="brand-lift group relative flex flex-col overflow-hidden rounded-2xl border bg-card hover:border-primary/35 hover:shadow-[0_14px_30px_-22px_#1f432f90]">
      <Link to={`/ganado/${anuncio.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        {anuncio.thumbnailUrl ? (
          <img
            src={anuncio.thumbnailUrl}
            alt={anuncio.title}
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <AnimalPlaceholder especie={anuncio.especieSlug} />
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {anuncio.reservado && (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              Reservado
            </span>
          )}
          {anuncio.isFeatured && !anuncio.reservado && (
            <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
              Destacado
            </span>
          )}
          <span className="rounded-md bg-background/90 px-2 py-0.5 text-[11px] font-medium">
            {anuncio.tipo === "lote"
              ? `Lote · ${anuncio.cantidad} cab.`
              : TIPO_ANUNCIO_LABEL[anuncio.tipo].split(" ")[0]}
          </span>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggle(anuncio.id)}
        aria-label={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
        className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-background/95 shadow-sm transition hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Heart className={cn("size-4", fav ? "fill-red-500 text-red-500" : "text-foreground/60")} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <p className="mb-1 text-xs font-semibold text-primary">{anuncio.especieName}</p>
        <Link to={`/ganado/${anuncio.slug}`} className="line-clamp-2 font-heading text-lg leading-snug font-semibold hover:underline">
          {anuncio.title}
        </Link>
        {detalle.length > 0 && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{detalle.join(" · ")}</p>
        )}
        <div className="mt-3 border-t pt-3">
          <Precio usd={anuncio.precioUsd} modalidad={anuncio.modalidadPrecio} size="sm" />
        </div>
        {anuncio.fincaName && (
          <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
              {anuncio.fincaName[0]}
            </span>
            <span className="truncate font-medium text-foreground/80">{anuncio.fincaName}</span>
            {anuncio.fincaVerificada && <BadgeCheck className="size-3.5 shrink-0 text-sky-600" aria-label="Finca verificada" />}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {anuncio.municipio}, {estadoName(anuncio.estado)}
            </span>
          </span>
          {anuncio.guiaMovilizacion && (
            <span className="inline-flex shrink-0 items-center gap-1 text-primary" title="Con guía de movilización">
              <FileCheck2 className="size-3.5" /> Guía
            </span>
          )}
        </div>
        {onUbicar && (
          <button
            type="button"
            onClick={onUbicar}
            className="mt-2 inline-flex min-h-8 w-fit items-center gap-1.5 rounded-md bg-secondary px-2.5 text-left text-xs font-semibold text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MapPin className="size-3.5" /> Ver en mapa
          </button>
        )}
      </div>
    </article>
  )
}

export function AnuncioGrid({ items }: { items: AnuncioCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((a) => (
        <AnuncioCard key={a.id} anuncio={a} />
      ))}
    </div>
  )
}

export function AnuncioGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border bg-card">
          <div className="aspect-[4/3] animate-pulse bg-muted" />
          <div className="space-y-2 p-3.5">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
