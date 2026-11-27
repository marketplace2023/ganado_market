import { useQuery } from "@tanstack/react-query"
import {
  ESTADOS_VENEZUELA,
  TIPOS_SERVICIO,
  TIPO_SERVICIO_LABEL,
  estadoName,
  toQuery,
  whatsappUrl,
  type Servicio,
} from "@workspace/shared"
import { EmptyState } from "@workspace/ui/components/dashboard-shell"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { BadgeCheck, MessageCircle, Stethoscope, Truck, Wheat, Dna, HandCoins } from "lucide-react"
import { useSearchParams } from "react-router"
import { api } from "@/lib/api"

const ICONS = { transporte: Truck, veterinario: Stethoscope, asesoria: HandCoins, inseminacion: Dna, alimento: Wheat }

export function ServiciosPage() {
  const [params, setParams] = useSearchParams()
  const tipo = params.get("tipo") ?? ""
  const estado = params.get("estado") ?? ""
  const { data, isLoading } = useQuery({
    queryKey: ["servicios", tipo, estado],
    queryFn: () => api.get<Servicio[]>(`/servicios${toQuery({ tipo, estado })}`),
  })
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Servicios para el ganadero</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Transporte de ganado, médicos veterinarios, inseminación y más, por estado.
      </p>
      <div className="mt-6 mb-6 flex flex-wrap gap-2">
        <NativeSelect value={tipo} onChange={(e) => set("tipo", e.target.value)} aria-label="Tipo">
          <NativeSelectOption value="">Todos los servicios</NativeSelectOption>
          {TIPOS_SERVICIO.map((t) => <NativeSelectOption key={t} value={t}>{TIPO_SERVICIO_LABEL[t]}</NativeSelectOption>)}
        </NativeSelect>
        <NativeSelect value={estado} onChange={(e) => set("estado", e.target.value)} aria-label="Estado">
          <NativeSelectOption value="">Toda Venezuela</NativeSelectOption>
          {ESTADOS_VENEZUELA.map((e) => <NativeSelectOption key={e.slug} value={e.slug}>{e.name}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      {isLoading ? null : data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => {
            const Icon = ICONS[s.tipo]
            const wa = whatsappUrl(s.whatsapp, `Hola, los encontré en GanadoMarket. Necesito ${TIPO_SERVICIO_LABEL[s.tipo].toLowerCase()}.`)
            return (
              <div key={s.id} className="flex flex-col rounded-xl border bg-card p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-semibold">
                      {s.name} {s.verified && <BadgeCheck className="size-4 text-sky-600" aria-label="Verificado" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{TIPO_SERVICIO_LABEL[s.tipo]}</p>
                  </div>
                </div>
                {s.description && <p className="mt-3 text-sm text-foreground/80">{s.description}</p>}
                <p className="mt-3 text-xs text-muted-foreground">
                  Cobertura: {s.estados.map(estadoName).join(", ")}
                </p>
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-primary hover:underline">
                    <MessageCircle className="size-4" /> Escribir por WhatsApp
                  </a>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={Truck} title="No hay servicios registrados con esos filtros" />
      )}
    </div>
  )
}
