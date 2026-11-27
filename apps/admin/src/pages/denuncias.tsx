import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ANUNCIO_STATUS_LABEL,
  DENUNCIA_MOTIVO_LABEL,
  DENUNCIA_STATUS,
  DENUNCIA_STATUS_LABEL,
  formatDateTime,
  type Denuncia,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { EmptyState, PageHeader } from "@workspace/ui/components/dashboard-shell"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { StatusBadge } from "@workspace/ui/components/form-field"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "cn"
import { Ban, ExternalLink, Flag, ShieldOff } from "lucide-react"
import { useState } from "react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { WEB_URL, api } from "@/lib/api"

export function DenunciasPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get("status") ?? "pendiente"
  const qc = useQueryClient()
  const [retirar, setRetirar] = useState<Denuncia | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ["admin-denuncias", status],
    queryFn: () => api.get<Denuncia[]>(`/admin/denuncias${status !== "todas" ? `?status=${status}` : ""}`),
  })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-denuncias"] })
    qc.invalidateQueries({ queryKey: ["stats"] })
  }
  const descartar = useMutation({
    mutationFn: (id: number) => api.post(`/admin/denuncias/${id}/descartar`),
    onSuccess: () => {
      toast.success("Denuncia descartada")
      refresh()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <>
      <PageHeader
        title="Denuncias"
        description="Reportes de usuarios sobre anuncios. Retirar un anuncio lo pasa a rechazado (el ganadero ve el motivo) y atiende todas sus denuncias."
      />
      <div className="mb-4 inline-flex gap-1 rounded-lg border bg-card p-1">
        {([...DENUNCIA_STATUS, "todas"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setParams(s === "pendiente" ? {} : { status: s })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "todas" ? "Todas" : DENUNCIA_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {isLoading ? null : data?.length ? (
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <a
                    href={`${WEB_URL}/ganado/${d.anuncio.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold hover:underline"
                  >
                    {d.anuncio.title} <ExternalLink className="size-3.5" />
                  </a>
                  <p className="text-sm text-muted-foreground">
                    De {d.anuncio.ownerName} ({d.anuncio.ownerEmail}) · anuncio {ANUNCIO_STATUS_LABEL[d.anuncio.status].toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {d.denunciasDelAnuncio > 1 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                      {d.denunciasDelAnuncio} denuncias pendientes
                    </span>
                  )}
                  <StatusBadge status={d.status} label={DENUNCIA_STATUS_LABEL[d.status]} />
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">
                <p className="flex items-center gap-1.5 font-medium">
                  <Flag className="size-4 text-destructive" /> {DENUNCIA_MOTIVO_LABEL[d.motivo]}
                </p>
                {d.detalle && <p className="mt-1 whitespace-pre-line text-foreground/80">{d.detalle}</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  Reportado por {d.reporterEmail ?? "cuenta eliminada"} · {formatDateTime(d.createdAt)}
                  {d.resolvedAt && ` · resuelta ${formatDateTime(d.resolvedAt)}`}
                </p>
              </div>
              {d.status === "pendiente" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {d.anuncio.status === "publicado" || d.anuncio.status === "vendido" ? (
                    <Button size="sm" variant="destructive" onClick={() => setRetirar(d)}>
                      <ShieldOff /> Retirar anuncio
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => descartar.mutate(d.id)} disabled={descartar.isPending}>
                    <Ban /> Descartar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Flag} title={status === "pendiente" ? "No hay denuncias pendientes" : "No hay denuncias en este estado"} />
      )}
      {retirar && <RetirarDialog denuncia={retirar} onClose={() => setRetirar(null)} onDone={refresh} />}
    </>
  )
}

function RetirarDialog({ denuncia, onClose, onDone }: { denuncia: Denuncia; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState(`Retirado por denuncia: ${DENUNCIA_MOTIVO_LABEL[denuncia.motivo]}`)
  const retirar = useMutation({
    mutationFn: () => api.post(`/admin/denuncias/${denuncia.id}/retirar`, { reason }),
    onSuccess: () => {
      toast.success("Anuncio retirado")
      onDone()
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Retirar “{denuncia.anuncio.title}”</DialogTitle>
          <DialogDescription>
            El anuncio deja de verse en el marketplace y pasa a “Rechazado”. El ganadero verá este motivo y podrá
            corregirlo y reenviarlo a revisión.
          </DialogDescription>
        </DialogHeader>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Motivo" />
        <DialogFooter>
          <Button variant="destructive" disabled={retirar.isPending || reason.trim().length < 5} onClick={() => retirar.mutate()}>
            Retirar anuncio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
