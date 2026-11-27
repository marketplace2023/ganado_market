import { useQuery } from "@tanstack/react-query"
import {
  estadoName,
  formatNumber,
  type AdminStats,
  type PublicSettings,
} from "@workspace/shared"
import { BackgroundGradient } from "@workspace/ui/components/background-gradient"
import { Button } from "@workspace/ui/components/button"
import { StatCard } from "@workspace/ui/components/dashboard-shell"
import { GridPattern } from "@workspace/ui/components/grid-pattern"
import { NumberTicker } from "@workspace/ui/components/number-ticker"
import {
  AlertTriangle,
  ArrowUpRight,
  Fence,
  Flag,
  Gavel,
  Inbox,
  Megaphone,
  Users,
} from "lucide-react"
import { Link } from "react-router"
import { api } from "@/lib/api"

export function DashboardPage() {
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats"),
  })
  const s = stats.data
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<PublicSettings>("/admin/catalogo/settings"),
  })
  const revisiones = [
    {
      to: "/denuncias?status=pendiente",
      label: "Denuncias",
      n: s?.denunciasPendientes,
      icon: Flag,
    },
    {
      to: "/anuncios?status=pendiente",
      label: "Anuncios",
      n: s?.anunciosPendientes,
      icon: Megaphone,
    },
    {
      to: "/fincas?verificacion=pendiente",
      label: "Fincas",
      n: s?.fincasPendientes,
      icon: Fence,
    },
    {
      to: "/subastas?status=pendiente",
      label: "Remates",
      n: s?.subastasPendientes,
      icon: Gavel,
    },
  ]
  const pendientes = revisiones.reduce(
    (total, item) => total + (item.n ?? 0),
    0
  )

  return (
    <div className="space-y-7">
      <BackgroundGradient className="brand-surface isolate overflow-hidden">
        <GridPattern
          size={32}
          className="mask-[linear-gradient(to_left,#000,transparent_85%)] text-[#a1e2d3]/18"
        />
        <div className="relative grid gap-7 p-5 sm:p-8 xl:grid-cols-[1fr_minmax(18rem,.85fr)] xl:items-start xl:gap-10">
          <div>
            <p className="mb-2 text-sm font-semibold text-[#9fe5d7]">
              Administración
            </p>
            <h1 className="text-3xl leading-none font-semibold tracking-tight text-balance sm:text-5xl">
              Control del marketplace
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/78">
              Atiende reportes, valida fincas y revisa lo que se publica en
              GanadoMarket.
            </p>
            <div className="mt-6 flex items-end gap-3 border-t border-white/15 pt-4">
              <span className="text-4xl leading-none font-semibold tracking-tight text-[#9fe5d7]">
                {s ? <NumberTicker value={pendientes} /> : "—"}
              </span>
              <span className="pb-0.5 text-sm text-white/85">por revisar</span>
            </div>
          </div>
          <section
            aria-labelledby="cola-revision"
            className="rounded-xl border border-white/15 bg-[#102631]/70"
          >
            <h2
              id="cola-revision"
              className="px-4 pt-4 pb-2 text-base font-semibold"
            >
              Cola de revisión
            </h2>
            <ul className="divide-y divide-white/10">
              {revisiones.map(({ to, label, n, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="group flex min-h-11 items-center gap-3 px-4 text-sm transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#9fe5d7] focus-visible:ring-inset"
                  >
                    <Icon className="size-4 text-[#9fe5d7]" />
                    <span className="flex-1">{label}</span>
                    <span
                      className={
                        n
                          ? "rounded-md bg-[#9fe5d7] px-2 py-0.5 font-semibold text-[#102631] tabular-nums"
                          : "font-medium text-white/70 tabular-nums"
                      }
                    >
                      {n ?? "—"}
                    </span>
                    <ArrowUpRight className="size-4 opacity-70 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </BackgroundGradient>

      {settings && settings.tasaBcv <= 0 && (
        <Link
          to="/configuracion"
          className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <AlertTriangle className="size-5 shrink-0" />
          La tasa BCV no está configurada: los precios no muestran su
          equivalente en bolívares. Configúrala aquí.
        </Link>
      )}
      {stats.isError && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 text-sm"
        >
          <p>No pudimos cargar las cifras del marketplace.</p>
          <Button variant="outline" onClick={() => stats.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      <section aria-labelledby="actividad-marketplace">
        <h2
          id="actividad-marketplace"
          className="mb-3 text-lg font-semibold tracking-tight"
        >
          Actividad del marketplace
        </h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Usuarios"
            value={s ? formatNumber(s.usuarios) : "—"}
            icon={Users}
            hint={
              s &&
              `${formatNumber(s.ganaderos)} ${s.ganaderos === 1 ? "ganadero" : "ganaderos"}`
            }
          />
          <StatCard
            label="Fincas registradas"
            value={s ? formatNumber(s.fincas) : "—"}
            icon={Fence}
          />
          <StatCard
            label="Anuncios publicados"
            value={s ? formatNumber(s.anunciosPublicados) : "—"}
            icon={Megaphone}
          />
          <StatCard
            label="Consultas"
            value={s ? formatNumber(s.consultas) : "—"}
            icon={Inbox}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <RankedBars
          title="Anuncios publicados por estado"
          rows={
            s?.porEstado.map((r) => ({
              label: estadoName(r.estado),
              value: r.total,
            })) ?? []
          }
        />
        <RankedBars
          title="Anuncios publicados por especie"
          rows={
            s?.porEspecie.map((r) => ({ label: r.especie, value: r.total })) ??
            []
          }
        />
      </div>
    </div>
  )
}

/**
 * Barras horizontales ordenadas (una sola serie → un solo tono, sin leyenda).
 * Valores en tinta de texto; tooltip nativo por barra; la lista misma sirve de vista tabular.
 */
function RankedBars({
  title,
  rows,
}: {
  title: string
  rows: { label: string; value: number }[]
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {rows.length ? (
        <ul className="mt-4 space-y-3" role="list">
          {rows.map((r) => (
            <li
              key={r.label}
              className="grid grid-cols-[minmax(0,8rem)_minmax(1rem,1fr)_auto] items-center gap-3 text-sm"
              title={`${r.label}: ${r.value}`}
            >
              <span className="text-muted-foreground">{r.label}</span>
              <span
                className="h-2.5 overflow-hidden rounded-full bg-muted"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </span>
              <span className="text-right font-medium tabular-nums">
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Sin datos todavía.</p>
      )}
    </section>
  )
}
