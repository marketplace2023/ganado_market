import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  FINCA_VERIFICACION,
  FINCA_VERIFICACION_LABEL,
  estadoName,
  formatDate,
  formatNumber,
  whatsappUrl,
  type Finca,
  type FincaVerificacion,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { EmptyState, PageHeader } from "@workspace/ui/components/dashboard-shell"
import { StatusBadge } from "@workspace/ui/components/form-field"
import { cn } from "cn"
import { BadgeCheck, ExternalLink, Fence, MessageCircle, X } from "lucide-react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { WEB_URL, api } from "@/lib/api"

export function FincasPage() {
  const [params, setParams] = useSearchParams()
  const verificacion = params.get("verificacion") ?? ""
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["admin-fincas", verificacion],
    queryFn: () => api.get<Finca[]>(`/admin/fincas${verificacion ? `?verificacion=${verificacion}` : ""}`),
  })
  const verificar = useMutation({
    mutationFn: ({ id, v }: { id: number; v: FincaVerificacion }) =>
      api.post(`/admin/fincas/${id}/verificacion`, { verificacion: v }),
    onSuccess: (_d, { v }) => {
      toast.success(v === "verificada" ? "Finca verificada" : "Verificación actualizada")
      qc.invalidateQueries({ queryKey: ["admin-fincas"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <>
      <PageHeader
        title="Verificación de fincas"
        description="Confirma RIF y hierro registrado antes de otorgar la insignia de finca verificada."
      />
      <div className="mb-4 inline-flex gap-1 rounded-lg border bg-card p-1">
        {(["", ...FINCA_VERIFICACION] as const).map((v) => (
          <button
            key={v || "todas"}
            onClick={() => setParams(v ? { verificacion: v } : {})}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              verificacion === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {v ? FINCA_VERIFICACION_LABEL[v] : "Todas"}
          </button>
        ))}
      </div>
      {isLoading ? null : data?.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((f) => {
            const wa = whatsappUrl(f.whatsapp)
            return (
              <div key={f.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{f.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {f.municipio}, {estadoName(f.estado)} · {f.ownerName} ({f.ownerEmail})
                    </p>
                  </div>
                  <StatusBadge status={f.verificacion} label={FINCA_VERIFICACION_LABEL[f.verificacion]} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">RIF</dt><dd className="font-medium">{f.rif ?? <span className="text-amber-700">Sin RIF</span>}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Hierro</dt><dd className="font-medium">{f.hierro ?? "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Hectáreas</dt><dd className="font-medium">{f.hectareas ? formatNumber(f.hectareas) : "—"}</dd></div>
                </dl>
                <p className="mt-2 text-xs text-muted-foreground">Registrada {formatDate(f.createdAt)} · {f.anunciosCount ?? 0} anuncios publicados</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {f.verificacion !== "verificada" && (
                    <Button size="sm" onClick={() => verificar.mutate({ id: f.id, v: "verificada" })}>
                      <BadgeCheck /> Verificar
                    </Button>
                  )}
                  {f.verificacion !== "rechazada" && (
                    <Button size="sm" variant="outline" onClick={() => verificar.mutate({ id: f.id, v: "rechazada" })}>
                      <X /> {f.verificacion === "verificada" ? "Revocar" : "Rechazar"}
                    </Button>
                  )}
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 text-sm text-primary hover:underline">
                      <MessageCircle className="size-4" /> Contactar
                    </a>
                  )}
                  <a href={`${WEB_URL}/fincas/${f.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 text-sm text-muted-foreground hover:text-foreground">
                    Perfil <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={Fence} title="No hay fincas en este estado" />
      )}
    </>
  )
}
