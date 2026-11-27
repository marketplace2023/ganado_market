import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  CATEGORIAS_ANIMAL,
  CATEGORIA_ANIMAL_LABEL,
  ESTADOS_VENEZUELA,
  SEXOS,
  SEXO_LABEL,
  TIPOS_ANUNCIO,
  TIPO_ANUNCIO_LABEL,
  estadoName,
  formatNumber,
  toQuery,
  type AnuncioCard,
  type Paginated,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { EmptyState } from "@workspace/ui/components/dashboard-shell"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { cn } from "cn"
import { SearchX, SlidersHorizontal, X } from "lucide-react"
import { useState } from "react"
import { useSearchParams } from "react-router"
import { AnuncioCard as TarjetaAnuncio, AnuncioGridSkeleton } from "@/components/anuncio-card"
import { PaginacionResultados, ResultadosMapa } from "@/components/resultados-mapa"
import { api, useEspecies } from "@/lib/api"
import { puntoAnuncio } from "@/lib/ubicaciones"

const FILTER_KEYS = [
  "q",
  "especie",
  "raza",
  "estado",
  "tipo",
  "sexo",
  "categoria",
  "minPrecio",
  "maxPrecio",
  "minPeso",
  "maxPeso",
  "minEdad",
  "maxEdad",
] as const

export function CatalogoPage() {
  const [params, setParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const { data: especies } = useEspecies()

  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ""])) as Record<
    (typeof FILTER_KEYS)[number],
    string
  >
  const orden = params.get("orden") ?? "destacados"
  const pagina = Number(params.get("page") ?? 1)
  const page = Number.isSafeInteger(pagina) && pagina > 0 ? pagina : 1
  const queryString = toQuery({ ...filters, orden, page, limit: 24 })

  const query = useQuery({
    queryKey: ["anuncios", queryString],
    queryFn: () => api.get<Paginated<AnuncioCard>>(`/anuncios${queryString}`),
    placeholderData: keepPreviousData,
  })

  function set(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === "especie") next.delete("raza")
    if (key !== "page") next.delete("page")
    setParams(next)
  }

  const especieActual = especies?.find((e) => e.slug === filters.especie)
  const titulo = [
    especieActual?.name ?? "Ganado",
    filters.estado ? `en ${estadoName(filters.estado)}` : "en Venezuela",
  ].join(" ")
  const activos = FILTER_KEYS.filter((k) => filters[k])
  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.limit)) : 1

  /** Par de campos mín./máx. que se aplican al salir del campo o con Enter. */
  const rango = (label: string, minKey: (typeof FILTER_KEYS)[number], maxKey: (typeof FILTER_KEYS)[number]) => (
    <Field label={label}>
      <div className="grid grid-cols-2 gap-2">
        {([minKey, maxKey] as const).map((k, i) => (
          <Input
            key={`${k}-${filters[k]}`}
            type="number"
            min={0}
            inputMode="decimal"
            placeholder={i === 0 ? "Mín." : "Máx."}
            aria-label={`${label} ${i === 0 ? "mínimo" : "máximo"}`}
            defaultValue={filters[k]}
            onKeyDown={(e) => e.key === "Enter" && set(k, e.currentTarget.value)}
            onBlur={(e) => e.currentTarget.value !== filters[k] && set(k, e.currentTarget.value)}
          />
        ))}
      </div>
    </Field>
  )

  const filtros = (
    <div className="space-y-4">
      <Field label="Buscar">
        <Input
          key={filters.q}
          defaultValue={filters.q}
          placeholder="Raza, municipio…"
          onKeyDown={(e) => e.key === "Enter" && set("q", e.currentTarget.value)}
          onBlur={(e) => e.currentTarget.value !== filters.q && set("q", e.currentTarget.value)}
        />
      </Field>
      <Field label="Especie">
        <Select value={filters.especie} onChange={(v) => set("especie", v)} placeholder="Todas">
          {especies?.map((e) => <NativeSelectOption key={e.slug} value={e.slug}>{e.name}</NativeSelectOption>)}
        </Select>
      </Field>
      {especieActual && (
        <Field label="Raza">
          <Select value={filters.raza} onChange={(v) => set("raza", v)} placeholder="Todas">
            {especieActual.razas.map((r) => <NativeSelectOption key={r.slug} value={r.slug}>{r.name}</NativeSelectOption>)}
          </Select>
        </Field>
      )}
      <Field label="Estado">
        <Select value={filters.estado} onChange={(v) => set("estado", v)} placeholder="Toda Venezuela">
          {ESTADOS_VENEZUELA.map((e) => <NativeSelectOption key={e.slug} value={e.slug}>{e.name}</NativeSelectOption>)}
        </Select>
      </Field>
      <Field label="Tipo de anuncio">
        <Select value={filters.tipo} onChange={(v) => set("tipo", v)} placeholder="Todos">
          {TIPOS_ANUNCIO.map((t) => <NativeSelectOption key={t} value={t}>{TIPO_ANUNCIO_LABEL[t]}</NativeSelectOption>)}
        </Select>
      </Field>
      <Field label="Clase de animal">
        <Select value={filters.categoria} onChange={(v) => set("categoria", v)} placeholder="Todas">
          {CATEGORIAS_ANIMAL.map((c) => <NativeSelectOption key={c} value={c}>{CATEGORIA_ANIMAL_LABEL[c]}</NativeSelectOption>)}
        </Select>
      </Field>
      <Field label="Sexo">
        <Select value={filters.sexo} onChange={(v) => set("sexo", v)} placeholder="Todos">
          {SEXOS.map((s) => <NativeSelectOption key={s} value={s}>{SEXO_LABEL[s]}</NativeSelectOption>)}
        </Select>
      </Field>
      {rango("Precio (USD)", "minPrecio", "maxPrecio")}
      {rango("Peso promedio (kg)", "minPeso", "maxPeso")}
      {rango("Edad (meses)", "minEdad", "maxEdad")}
      {activos.length > 0 && (
        <Button variant="outline" className="w-full" onClick={() => setParams(params.get("vista") === "mapa" ? { vista: "mapa" } : {})}>
          Limpiar filtros
        </Button>
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {query.data ? `${formatNumber(query.data.total)} anuncios` : "Buscando…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="lg:hidden" onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal /> Filtros {activos.length > 0 && `(${activos.length})`}
          </Button>
          <NativeSelect value={orden} onChange={(e) => set("orden", e.target.value)} aria-label="Ordenar">
            <NativeSelectOption value="destacados">Destacados primero</NativeSelectOption>
            <NativeSelectOption value="recientes">Más recientes</NativeSelectOption>
            <NativeSelectOption value="precio_asc">Menor precio</NativeSelectOption>
            <NativeSelectOption value="precio_desc">Mayor precio</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>

      {activos.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {activos.map((k) => (
            <button
              key={k}
              onClick={() => set(k, "")}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium hover:bg-secondary/70"
            >
              {chipLabel(k, filters[k], especies)} <X className="size-3" />
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={cn("lg:block", showFilters ? "block" : "hidden")}>
          <div className="rounded-xl border bg-card p-4 lg:sticky lg:top-20">{filtros}</div>
        </aside>
        <div>
          {query.isLoading ? (
            <AnuncioGridSkeleton />
          ) : query.isError ? (
            <EmptyState icon={SearchX} title="No pudimos cargar los anuncios" action={<Button onClick={() => query.refetch()}>Reintentar</Button>} />
          ) : query.data?.items.length ? (
            <>
              <div className={cn(query.isFetching && "opacity-60 transition-opacity")}>
                <ResultadosMapa
                  items={query.data.items}
                  ubicar={puntoAnuncio}
                  renderResultado={(anuncio, acciones) => <TarjetaAnuncio anuncio={anuncio} onUbicar={acciones?.seleccionar} />}
                />
              </div>
              <PaginacionResultados page={page} totalPages={totalPages} onChange={(nueva) => set("page", String(nueva))} />
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No encontramos ganado con esos filtros"
              description="Prueba ampliar la búsqueda a otros estados o quitar algún filtro."
            />
          )}
        </div>
      </div>
    </div>
  )
}

function chipLabel(key: string, value: string, especies?: { slug: string; name: string; razas: { slug: string; name: string }[] }[]) {
  switch (key) {
    case "especie":
      return especies?.find((e) => e.slug === value)?.name ?? value
    case "raza":
      return especies?.flatMap((e) => e.razas).find((r) => r.slug === value)?.name ?? value
    case "estado":
      return estadoName(value)
    case "tipo":
      return TIPO_ANUNCIO_LABEL[value as keyof typeof TIPO_ANUNCIO_LABEL] ?? value
    case "sexo":
      return SEXO_LABEL[value as keyof typeof SEXO_LABEL] ?? value
    case "categoria":
      return CATEGORIA_ANIMAL_LABEL[value as keyof typeof CATEGORIA_ANIMAL_LABEL] ?? value
    case "minPrecio":
      return `Desde $${value}`
    case "maxPrecio":
      return `Hasta $${value}`
    case "minPeso":
      return `Desde ${value} kg`
    case "maxPeso":
      return `Hasta ${value} kg`
    case "minEdad":
      return `Desde ${value} meses`
    case "maxEdad":
      return `Hasta ${value} meses`
    default:
      return `“${value}”`
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function Select({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  children: React.ReactNode
}) {
  return (
    <NativeSelect className="w-full" value={value} onChange={(e) => onChange(e.target.value)}>
      <NativeSelectOption value="">{placeholder}</NativeSelectOption>
      {children}
    </NativeSelect>
  )
}
