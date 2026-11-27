import { useQuery } from "@tanstack/react-query"
import { estadoName, formatNumber, type AdminStats, type PublicSettings } from "@workspace/shared"
import { PageHeader, StatCard } from "@workspace/ui/components/dashboard-shell"
import { AlertTriangle, Fence, Gavel, Inbox, Megaphone, Users } from "lucide-react"
import { Link } from "react-router"
import { api } from "@/lib/api"

export function DashboardPage() {
  const { data: s } = useQuery({ queryKey: ["stats"], queryFn: () => api.get<AdminStats>("/admin/stats") })
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<PublicSettings>("/admin/catalogo/settings"),
  })
  const pendientes =
    (s?.anunciosPendientes ?? 0) + (s?.fincasPendientes ?? 0) + (s?.subastasPendientes ?? 0) + (s?.denunciasPendientes ?? 0)

  return (
    <>
      <PageHeader title="Dashboard" description="Estado general del marketplace ganadero." />

      {settings && settings.tasaBcv <= 0 && (
        <Link
          to="/configuracion"
          className="mb-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <AlertTriangle className="size-5 shrink-0" />
          La tasa BCV no está configurada: los precios no muestran su equivalente en bolívares. Configúrala aquí.
        </Link>
      )}
      {pendientes > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Pending to="/denuncias" n={s?.denunciasPendientes} label="denuncias por revisar" />
          <Pending to="/anuncios" n={s?.anunciosPendientes} label="anuncios por revisar" />
          <Pending to="/fincas?verificacion=pendiente" n={s?.fincasPendientes} label="fincas por verificar" />
          <Pending to="/subastas?status=pendiente" n={s?.subastasPendientes} label="remates por aprobar" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Usuarios" value={s ? formatNumber(s.usuarios) : "–"} icon={Users} hint={s && `${s.ganaderos} ganaderos`} />
        <StatCard label="Fincas" value={s?.fincas ?? "–"} icon={Fence} />
        <StatCard label="Anuncios publicados" value={s?.anunciosPublicados ?? "–"} icon={Megaphone} />
        <StatCard label="Consultas" value={s?.consultas ?? "–"} icon={Inbox} />
        <StatCard label="Remates por aprobar" value={s?.subastasPendientes ?? "–"} icon={Gavel} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RankedBars
          title="Anuncios publicados por estado"
          rows={s?.porEstado.map((r) => ({ label: estadoName(r.estado), value: r.total })) ?? []}
        />
        <RankedBars
          title="Anuncios publicados por especie"
          rows={s?.porEspecie.map((r) => ({ label: r.especie, value: r.total })) ?? []}
        />
      </div>
    </>
  )
}

function Pending({ to, n, label }: { to: string; n?: number; label: string }) {
  if (!n) return null
  return (
    <Link to={to} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 transition hover:border-amber-400">
      <p className="text-2xl font-semibold text-amber-900 tabular-nums">{n}</p>
      <p className="text-sm text-amber-800">{label}</p>
    </Link>
  )
}

/**
 * Barras horizontales ordenadas (una sola serie → un solo tono, sin leyenda).
 * Valores en tinta de texto; tooltip nativo por barra; la lista misma sirve de vista tabular.
 */
function RankedBars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="font-semibold">{title}</p>
      {rows.length ? (
        <ul className="mt-4 space-y-3" role="list">
          {rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-sm" title={`${r.label}: ${r.value}`}>
              <span className="truncate text-muted-foreground">{r.label}</span>
              <span className="h-2.5 rounded-r bg-muted">
                <span
                  className="block h-full rounded-r bg-primary"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </span>
              <span className="text-right font-medium tabular-nums">{r.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Sin datos todavía.</p>
      )}
    </div>
  )
}
