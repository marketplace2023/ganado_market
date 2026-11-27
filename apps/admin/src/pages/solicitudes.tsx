import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  URGENCIA_LABEL,
  estadoName,
  formatDate,
  formatUsd,
  type Solicitud,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { EmptyState, PageHeader } from "@workspace/ui/components/dashboard-shell"
import { StatusBadge } from "@workspace/ui/components/form-field"
import { cn } from "cn"
import { ClipboardList, Trash2, X } from "lucide-react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { api } from "@/lib/api"

type AdminSolicitud = Omit<Solicitud, "autorAlias" | "autorIniciales"> & { autorName: string; autorEmail: string }
const FILTROS = [
  ["activa", "Activas"],
  ["vencida", "Vencidas"],
  ["cerrada", "Cerradas"],
  ["", "Todas"],
] as const

export function SolicitudesPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get("status") ?? "activa"
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["admin-solicitudes", status],
    queryFn: () =>
      api.get<AdminSolicitud[]>(`/admin/solicitudes${status && status !== "todas" ? `?status=${status}` : ""}`),
  })
  const act = useMutation({
    mutationFn: ({ id, path }: { id: number; path: "cerrar" | "eliminar" }) =>
      path === "eliminar" ? api.del(`/admin/solicitudes/${id}`) : api.post(`/admin/solicitudes/${id}/cerrar`),
    onSuccess: () => {
      toast.success("Solicitud actualizada")
      qc.invalidateQueries({ queryKey: ["admin-solicitudes"] })
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <>
      <PageHeader
        title="Solicitudes de compra"
        description="Se publican sin revisión previa. Cierra o elimina las que sean spam o engañosas."
      />
      <div className="mb-4 inline-flex gap-1 rounded-lg border bg-card p-1">
        {FILTROS.map(([value, label]) => (
          <button
            key={label}
            onClick={() => setParams(value === "activa" ? {} : { status: value || "todas" })}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              (status === "todas" ? "" : status) === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {isLoading ? null : data?.length ? (
        <div className="divide-y rounded-xl border bg-card">
          {data.map((s) => (
            <div key={s.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={s.urgencia} label={URGENCIA_LABEL[s.urgencia]} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(s.createdAt)} · vence {formatDate(s.expiresAt)} · {s.contactosCount} contactos
                  </span>
                </div>
                <p className="mt-1 font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">
                  {[s.especieName, s.estado ? estadoName(s.estado) : null, s.presupuestoMaxUsd ? `hasta ${formatUsd(s.presupuestoMaxUsd)}` : null]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  — {s.autorName} ({s.autorEmail})
                </p>
              </div>
              <div className="flex gap-1.5">
                {s.status === "activa" && (
                  <Button variant="outline" size="sm" onClick={() => act.mutate({ id: s.id, path: "cerrar" })}>
                    <X /> Cerrar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Eliminar"
                  onClick={() => confirm(`¿Eliminar "${s.title}"?`) && act.mutate({ id: s.id, path: "eliminar" })}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No hay solicitudes en este estado" />
      )}
    </>
  )
}
