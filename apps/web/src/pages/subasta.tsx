import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ApiError,
  SUBASTA_STATUS_LABEL,
  estadoName,
  formatDateTime,
  formatNumber,
  formatUsd,
  type Lote,
  type SubastaDetail,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { StatusBadge } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Gavel, MapPin, Timer } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useLocation, useParams } from "react-router"
import { toast } from "sonner"
import { AnimalPlaceholder } from "@/components/animal-placeholder"
import { api, useAuth } from "@/lib/api"
import { countdown, useNow } from "@/lib/use-now"
import { NotFoundPage } from "./not-found"

export function SubastaPage() {
  const { slug } = useParams()
  const now = useNow(1000)
  const { data: s, error } = useQuery({
    queryKey: ["subasta", slug],
    queryFn: () => api.get<SubastaDetail>(`/subastas/${slug}`),
    // Mientras está en vivo, refresca pujas cada 5 s.
    refetchInterval: (q) => (q.state.data?.status === "en_vivo" ? 5000 : false),
    retry: false,
  })

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />
  if (!s) return <div className="mx-auto max-w-5xl px-4 py-8"><Skeleton className="h-64 rounded-xl" /></div>

  const enVivo = s.status === "en_vivo"
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-emerald-900 p-6 text-primary-foreground sm:p-8">
        <StatusBadge status={s.status} label={SUBASTA_STATUS_LABEL[s.status]} />
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{s.title}</h1>
        <p className="mt-2 flex items-center gap-1 text-sm text-primary-foreground/80">
          <MapPin className="size-4" />
          <Link to={`/fincas/${s.fincaSlug}`} className="hover:underline">{s.fincaName}</Link> · {estadoName(s.estado)}
        </p>
        <div className="mt-5 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-primary-foreground/60">Inicio</p>
            <p className="font-medium">{formatDateTime(s.startsAt)}</p>
          </div>
          <div>
            <p className="text-primary-foreground/60">Cierre</p>
            <p className="font-medium">{formatDateTime(s.endsAt)}</p>
          </div>
          {(enVivo || s.status === "programada") && (
            <div>
              <p className="text-primary-foreground/60">{enVivo ? "Cierra en" : "Comienza en"}</p>
              <p className="flex items-center gap-1 text-lg font-semibold tabular-nums">
                <Timer className="size-5" /> {countdown(enVivo ? s.endsAt : s.startsAt, now)}
              </p>
            </div>
          )}
        </div>
        {s.description && <p className="mt-5 max-w-2xl text-sm text-primary-foreground/85">{s.description}</p>}
      </div>

      <h2 className="mt-8 mb-4 text-xl font-semibold">Lotes ({s.lotes.length})</h2>
      <div className="space-y-4">
        {s.lotes.map((l) => (
          <LoteRow key={l.id} lote={l} enVivo={enVivo} slug={s.slug} finalizada={s.status === "finalizada"} />
        ))}
      </div>
    </div>
  )
}

function LoteRow({ lote, enVivo, slug, finalizada }: { lote: Lote; enVivo: boolean; slug: string; finalizada: boolean }) {
  const { user } = useAuth()
  const location = useLocation()
  const qc = useQueryClient()
  const [monto, setMonto] = useState("")
  const a = lote.anuncio

  const pujar = useMutation({
    mutationFn: (montoUsd: number) => api.post(`/subastas/lotes/${lote.id}/pujas`, { montoUsd }),
    onSuccess: () => {
      toast.success("¡Puja registrada!")
      setMonto("")
      qc.invalidateQueries({ queryKey: ["subasta", slug] })
    },
    onError: (err) => toast.error(err.message),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    pujar.mutate(Number(monto || lote.minimoSiguienteUsd))
  }

  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[140px_1fr_260px]">
      <Link to={`/ganado/${a.slug}`} className="aspect-[4/3] overflow-hidden rounded-lg bg-muted sm:aspect-square">
        {a.thumbnailUrl ? <img src={a.thumbnailUrl} alt="" className="size-full object-cover" /> : <AnimalPlaceholder especie={a.especieSlug} />}
      </Link>
      <div>
        <p className="text-xs font-semibold text-primary">Lote {lote.orden}</p>
        <Link to={`/ganado/${a.slug}`} className="font-semibold hover:underline">{a.title}</Link>
        <p className="mt-1 text-sm text-muted-foreground">
          {[a.razaName, `${formatNumber(a.cantidad)} cab.`, a.pesoPromedioKg ? `${formatNumber(a.pesoPromedioKg)} kg prom.` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Base {formatUsd(lote.precioBaseUsd)} · Incremento {formatUsd(lote.incrementoUsd)} · {lote.pujasCount} pujas
        </p>
      </div>
      <div className="rounded-lg bg-muted/60 p-3">
        <p className="text-xs text-muted-foreground">{finalizada ? "Puja ganadora" : "Mejor puja"}</p>
        <p className="text-2xl font-semibold tabular-nums">
          {lote.mejorPujaUsd !== null ? formatUsd(lote.mejorPujaUsd) : "—"}
        </p>
        {enVivo &&
          (user ? (
            <form onSubmit={submit} className="mt-3 flex gap-2">
              <Input
                type="number"
                min={lote.minimoSiguienteUsd}
                step="any"
                placeholder={String(lote.minimoSiguienteUsd)}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                aria-label="Monto en USD"
              />
              <Button type="submit" disabled={pujar.isPending}>
                <Gavel /> Pujar
              </Button>
            </form>
          ) : (
            <Link
              to="/ingresar"
              state={{ from: location.pathname }}
              className="mt-3 block text-sm font-medium text-primary hover:underline"
            >
              Inicia sesión para pujar
            </Link>
          ))}
        {enVivo && <p className="mt-1.5 text-xs text-muted-foreground">Mínimo: {formatUsd(lote.minimoSiguienteUsd)}</p>}
      </div>
    </div>
  )
}
