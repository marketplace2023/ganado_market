import { Button } from "@workspace/ui/components/button"
import { cn } from "cn"
import { ChevronLeft, ChevronRight, List, Map, MapPin } from "lucide-react"
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { useSearchParams } from "react-router"
import { precisionMapa, type PuntoMapa } from "@/lib/ubicaciones"
import type { EnfoqueMapa } from "./ubicaciones-mapa"

const UbicacionesMapa = lazy(() => import("./ubicaciones-mapa"))
const consultaEscritorio = "(min-width: 64rem)"

function suscribirEscritorio(actualizar: () => void) {
  const media = window.matchMedia(consultaEscritorio)
  media.addEventListener("change", actualizar)
  return () => media.removeEventListener("change", actualizar)
}

function escritorioActivo() {
  return window.matchMedia(consultaEscritorio).matches
}

type AccionesResultado = { seleccionar: () => void }

export function ResultadosMapa<T extends { id: number }>({
  items,
  ubicar,
  renderResultado,
}: {
  items: T[]
  ubicar: (item: T) => PuntoMapa | null
  renderResultado: (item: T, acciones?: AccionesResultado) => ReactNode
}) {
  const [params, setParams] = useSearchParams()
  const vistaMapa = params.get("vista") === "mapa"
  const escritorio = useSyncExternalStore(suscribirEscritorio, escritorioActivo)
  const [seleccionado, setSeleccionado] = useState<number>()
  const [enfoque, setEnfoque] = useState<EnfoqueMapa | null>(null)
  const [resultado, setResultado] = useState<EnfoqueMapa | null>(null)
  const mapa = useRef<HTMLDivElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const puntos = useMemo(
    () => items.flatMap((item) => ubicar(item) ?? []),
    [items, ubicar]
  )
  const idsUbicados = useMemo(() => new Set(puntos.map((p) => p.id)), [puntos])

  const actualizarVista = (mostrarMapa: boolean) => {
    if (vistaMapa === mostrarMapa) return
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (mostrarMapa) next.set("vista", "mapa")
        else next.delete("vista")
        return next
      },
      { replace: true, preventScrollReset: true }
    )
  }

  function mostrarResultado(id: number) {
    setEnfoque(null)
    setSeleccionado(id)
    setResultado({ id })
    actualizarVista(false)
  }

  function mostrarPunto(id: number) {
    setSeleccionado(id)
    setEnfoque({ id })
    actualizarVista(true)
  }

  useEffect(() => {
    if (enfoque) mapa.current?.scrollIntoView({ block: "nearest" })
  }, [enfoque])

  useEffect(() => {
    if (!resultado) return
    const tarjeta = lista.current?.querySelector<HTMLElement>(
      `[data-resultado="${resultado.id}"]`
    )
    tarjeta?.focus({ preventScroll: true })
    tarjeta?.scrollIntoView({ block: "nearest" })
  }, [resultado])

  return (
    <div className="min-w-0">
      <div
        className="mb-3 flex gap-2 lg:hidden"
        role="group"
        aria-label="Vista de resultados"
      >
        <Button
          variant={vistaMapa ? "outline" : "default"}
          aria-pressed={!vistaMapa}
          onClick={() => actualizarVista(false)}
        >
          <List /> Lista
        </Button>
        <Button
          variant={vistaMapa ? "default" : "outline"}
          aria-pressed={vistaMapa}
          onClick={() => actualizarVista(true)}
        >
          <Map /> Mapa
        </Button>
      </div>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,1fr)]">
        <ul
          ref={lista}
          className={cn(
            "min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid lg:grid-cols-1",
            vistaMapa ? "hidden" : "grid"
          )}
        >
          {items.map((item) => (
            <li
              key={item.id}
              data-resultado={item.id}
              tabIndex={-1}
              className={cn(
                "min-w-0 scroll-mt-24 rounded-xl",
                seleccionado === item.id && "ring-2 ring-primary/70"
              )}
            >
              {renderResultado(
                item,
                idsUbicados.has(item.id)
                  ? {
                      seleccionar: () => mostrarPunto(item.id),
                    }
                  : undefined
              )}
            </li>
          ))}
        </ul>
        <div
          ref={mapa}
          className={cn(
            "scroll-mt-24 lg:sticky lg:top-20 lg:block",
            !vistaMapa && "hidden"
          )}
        >
          {(escritorio || vistaMapa) &&
            (puntos.length ? (
              <div className="space-y-2">
                <MapaPanel
                  puntos={puntos}
                  enfoque={enfoque}
                  onMostrarResultado={mostrarResultado}
                  onSeleccionar={setSeleccionado}
                />
                <p className="text-xs text-muted-foreground">
                  {puntos.length} de {items.length} resultados en el mapa. Los
                  marcadores indican si el punto es público o aproximado.
                </p>
              </div>
            ) : (
              <div className="flex min-h-60 items-center justify-center gap-2 rounded-xl border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" /> Estos resultados no
                tienen una ubicación disponible.
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function MapaPanel({
  compacto,
  ...props
}: React.ComponentProps<typeof UbicacionesMapa> & { compacto?: boolean }) {
  return (
    <div
      role="region"
      aria-label="Mapa de ubicaciones"
      className={cn(
        "isolate overflow-hidden rounded-xl border bg-muted",
        compacto
          ? "h-64"
          : "h-[min(56vh,34rem)] min-h-72 lg:h-[min(68vh,40rem)]"
      )}
    >
      <Suspense
        fallback={
          <div className="grid size-full place-items-center text-sm text-muted-foreground">
            Cargando mapa…
          </div>
        }
      >
        <UbicacionesMapa {...props} />
      </Suspense>
    </div>
  )
}

export function MapaUbicacion({ punto }: { punto: PuntoMapa | null }) {
  if (!punto) return null
  return (
    <section className="space-y-2" aria-label="Ubicación">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <MapPin className="size-4" /> Ubicación
      </h2>
      <p className="text-sm text-muted-foreground">
        {precisionMapa[punto.precision]} · {punto.lugar}
      </p>
      <MapaPanel compacto puntos={[punto]} />
    </section>
  )
}

export function PaginacionResultados({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-3"
      aria-label="Páginas de resultados"
    >
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft /> Anterior
      </Button>
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <Button
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Siguiente <ChevronRight />
      </Button>
    </nav>
  )
}
