import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  ESTADOS_VENEZUELA,
  estadoName,
  formatNumber,
  toQuery,
  type FincaEnDirectorio,
  type Paginated,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { EmptyState } from "@workspace/ui/components/dashboard-shell"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { BadgeCheck, MapPin, Search, SearchX } from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { DirectoryHeading } from "@/components/directory-heading"
import {
  PaginacionResultados,
  ResultadosMapa,
} from "@/components/resultados-mapa"
import { api } from "@/lib/api"
import { puntoFinca } from "@/lib/ubicaciones"

export function FincasPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get("q") ?? ""
  const estado = params.get("estado") ?? ""
  const pagina = Number(params.get("page") ?? 1)
  const page = Number.isSafeInteger(pagina) && pagina > 0 ? pagina : 1
  const queryString = toQuery({ q, estado, page, limit: 24 })
  const query = useQuery({
    queryKey: ["fincas", queryString],
    queryFn: () =>
      api.get<Paginated<FincaEnDirectorio>>(`/fincas${queryString}`),
    placeholderData: keepPreviousData,
  })
  const { data } = query

  function cambiar(key: "q" | "estado" | "page", value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== "page") next.delete("page")
    setParams(next)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <DirectoryHeading
        title={estado ? `Fincas en ${estadoName(estado)}` : "Fincas en Venezuela"}
        count={data ? `${formatNumber(data.total)} ${data.total === 1 ? "finca" : "fincas"}` : query.isLoading ? "Buscando…" : undefined}
      />
      <div className="mb-5 flex flex-wrap gap-3 rounded-xl border bg-card p-3">
        <form
          role="search"
          className="flex w-full max-w-md gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            cambiar(
              "q",
              String(new FormData(event.currentTarget).get("q") ?? "").trim()
            )
          }}
        >
          <Input
            key={q}
            name="q"
            type="search"
            aria-label="Buscar fincas"
            placeholder="Nombre, municipio o estado"
            defaultValue={q}
            maxLength={120}
          />
          <Button type="submit">
            <Search /> Buscar
          </Button>
        </form>
        <NativeSelect
          value={estado}
          aria-label="Estado"
          onChange={(e) => cambiar("estado", e.target.value)}
        >
          <NativeSelectOption value="">Toda Venezuela</NativeSelectOption>
          {ESTADOS_VENEZUELA.map((e) => (
            <NativeSelectOption key={e.slug} value={e.slug}>
              {e.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {query.isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : query.isError ? (
        <EmptyState
          icon={SearchX}
          title="No pudimos cargar las fincas"
          action={<Button onClick={() => query.refetch()}>Reintentar</Button>}
        />
      ) : data?.items.length ? (
        <div aria-busy={query.isFetching}>
          <ResultadosMapa
            items={data.items}
            ubicar={puntoFinca}
            renderResultado={(finca, acciones) => (
              <TarjetaFinca finca={finca} onUbicar={acciones?.seleccionar} />
            )}
          />
          <PaginacionResultados
            page={page}
            totalPages={Math.ceil(data.total / data.limit)}
            onChange={(nueva) => cambiar("page", String(nueva))}
          />
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No encontramos fincas con esos filtros"
          action={
            <Button
              variant="outline"
              onClick={() =>
                setParams(
                  params.get("vista") === "mapa" ? { vista: "mapa" } : {}
                )
              }
            >
              Limpiar filtros
            </Button>
          }
        />
      )}
    </div>
  )
}

function TarjetaFinca({
  finca,
  onUbicar,
}: {
  finca: FincaEnDirectorio
  onUbicar?: () => void
}) {
  return (
    <article className="brand-lift flex items-start gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-lg font-semibold text-secondary-foreground">
        {finca.logoUrl ? (
          <img
            src={finca.logoUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          finca.name[0]
        )}
      </div>
      <div className="min-w-0">
        <Link
          to={`/fincas/${finca.slug}`}
          className="inline-flex items-center gap-1.5 font-heading text-lg font-semibold hover:underline"
        >
          {finca.name}
          {finca.verificada && (
            <BadgeCheck
              className="size-4 shrink-0 text-sky-600"
              aria-label="Finca verificada"
            />
          )}
        </Link>
        <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" /> {finca.municipio},{" "}
          {estadoName(finca.estado)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatNumber(finca.anunciosCount)}{" "}
          {finca.anunciosCount === 1
            ? "anuncio disponible"
            : "anuncios disponibles"}
        </p>
        {onUbicar && (
          <button
            type="button"
            onClick={onUbicar}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Ver en mapa
          </button>
        )}
      </div>
    </article>
  )
}
