import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { AUDIT_ACTION_LABEL, formatDateTime, toQuery, type AuditEntry, type Paginated } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { EmptyState, PageHeader } from "@workspace/ui/components/dashboard-shell"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { ChevronLeft, ChevronRight, History } from "lucide-react"
import { useSearchParams } from "react-router"
import { api } from "@/lib/api"

const ENTIDADES = [
  ["", "Todo"],
  ["anuncio", "Anuncios"],
  ["finca", "Fincas"],
  ["subasta", "Remates"],
  ["solicitud", "Solicitudes"],
  ["denuncia", "Denuncias"],
  ["usuario", "Usuarios"],
  ["servicio", "Servicios"],
  ["especie", "Especies"],
  ["raza", "Razas"],
  ["config", "Configuración"],
] as const

export function HistorialPage() {
  const [params, setParams] = useSearchParams()
  const entityType = params.get("entidad") ?? ""
  const page = Number(params.get("page") ?? 1)
  const { data, isLoading } = useQuery({
    queryKey: ["admin-historial", entityType, page],
    queryFn: () => api.get<Paginated<AuditEntry>>(`/admin/historial${toQuery({ entityType, page })}`),
    placeholderData: keepPreviousData,
  })
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    if (k !== "page") next.delete("page")
    setParams(next)
  }

  return (
    <>
      <PageHeader
        title="Historial de acciones"
        description="Quién aprobó, rechazó, editó o eliminó qué, y cuándo. Se conserva aunque se borre la cuenta del admin."
        actions={
          <NativeSelect value={entityType} onChange={(e) => set("entidad", e.target.value)} aria-label="Filtrar por tipo">
            {ENTIDADES.map(([v, l]) => <NativeSelectOption key={v} value={v}>{l}</NativeSelectOption>)}
          </NativeSelect>
        }
      />
      {isLoading ? null : data?.items.length ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Fecha</th>
                <th className="px-4 py-2.5 font-medium">Admin</th>
                <th className="px-4 py-2.5 font-medium">Acción</th>
                <th className="px-4 py-2.5 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">{formatDateTime(a.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.adminName}</p>
                    <p className="text-xs text-muted-foreground">{a.adminEmail}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{AUDIT_ACTION_LABEL[a.action] ?? a.action}</td>
                  <td className="px-4 py-3 text-foreground/80">{a.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={History} title="Aún no hay acciones registradas" />
      )}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => set("page", String(page - 1))} aria-label="Anterior"><ChevronLeft /></Button>
          {page} / {totalPages}
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => set("page", String(page + 1))} aria-label="Siguiente"><ChevronRight /></Button>
        </div>
      )}
    </>
  )
}
