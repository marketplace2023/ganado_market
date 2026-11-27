import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  SUBASTA_STATUS,
  SUBASTA_STATUS_LABEL,
  formatDateTime,
  formatUsd,
  type Lote,
  type SubastaOwned,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { EmptyState, PageHeader } from "@workspace/ui/components/dashboard-shell"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@workspace/ui/components/dialog"
import { StatusBadge } from "@workspace/ui/components/form-field"
import { cn } from "cn"
import { Ban, Check, Eye, Gavel } from "lucide-react"
import { useState } from "react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { api } from "@/lib/api"

export function SubastasPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get("status") ?? ""
  const qc = useQueryClient()
  const [detalle, setDetalle] = useState<number | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ["admin-subastas", status],
    queryFn: () => api.get<SubastaOwned[]>(`/admin/subastas${status ? `?status=${status}` : ""}`),
  })
  const act = useMutation({
    mutationFn: ({ id, path }: { id: number; path: "aprobar" | "cancelar" }) => api.post(`/admin/subastas/${id}/${path}`),
    onSuccess: (_d, { path }) => {
      toast.success(path === "aprobar" ? "Remate aprobado y programado" : "Remate cancelado")
      qc.invalidateQueries({ queryKey: ["admin-subastas"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <>
      <PageHeader title="Remates virtuales" description="Aprueba los remates antes de que se abran a pujas." />
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1">
        {(["", ...SUBASTA_STATUS] as const).map((s) => (
          <button
            key={s || "todos"}
            onClick={() => setParams(s ? { status: s } : {})}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium",
              status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s ? SUBASTA_STATUS_LABEL[s] : "Todos"}
          </button>
        ))}
      </div>
      {isLoading ? null : data?.length ? (
        <div className="divide-y rounded-xl border bg-card">
          {data.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">
                  {s.fincaName} · {s.ownerName} · {s.lotesCount} lotes · {formatDateTime(s.startsAt)} → {formatDateTime(s.endsAt)}
                </p>
              </div>
              <StatusBadge status={s.status} label={SUBASTA_STATUS_LABEL[s.status]} />
              <div className="flex gap-1.5">
                <Button variant="ghost" size="icon-sm" aria-label="Ver lotes" onClick={() => setDetalle(s.id)}><Eye /></Button>
                {s.rawStatus === "pendiente" && (
                  <Button size="sm" onClick={() => act.mutate({ id: s.id, path: "aprobar" })}><Check /> Aprobar</Button>
                )}
                {s.status !== "cancelada" && s.status !== "finalizada" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirm(`¿Cancelar "${s.title}"?`) && act.mutate({ id: s.id, path: "cancelar" })}
                  >
                    <Ban /> Cancelar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Gavel} title="No hay remates en este estado" />
      )}
      <LotesDialog id={detalle} onClose={() => setDetalle(null)} />
    </>
  )
}

function LotesDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["admin-subasta", id],
    queryFn: () => api.get<SubastaOwned & { lotes: (Lote & { mejorPostor?: string | null })[] }>(`/admin/subastas/${id}`),
    enabled: id !== null,
  })
  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{data?.title ?? "Remate"}</DialogTitle>
          <DialogDescription>{data?.description || "Sin condiciones especificadas."}</DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-lg border">
          {data?.lotes.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">Lote {l.orden}: {l.anuncio.title}</p>
                <p className="text-xs text-muted-foreground">Base {formatUsd(l.precioBaseUsd)} · {l.pujasCount} pujas{l.mejorPostor ? ` · ${l.mejorPostor}` : ""}</p>
              </div>
              <span className="font-semibold tabular-nums">{l.mejorPujaUsd !== null ? formatUsd(l.mejorPujaUsd) : "—"}</span>
            </li>
          ))}
          {data?.lotes.length === 0 && <li className="p-3 text-sm text-muted-foreground">Sin lotes.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
