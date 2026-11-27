import { useQuery } from "@tanstack/react-query"
import {
  CONSULTA_STATUS_LABEL,
  formatDateTime,
  formatNumber,
  type Consulta,
  type GanaderoStats,
} from "@workspace/shared"
import { buttonVariants } from "@workspace/ui/components/button"
import { PageHeader, StatCard } from "@workspace/ui/components/dashboard-shell"
import { StatusBadge } from "@workspace/ui/components/form-field"
import { cn } from "cn"
import { Clock, Eye, Fence, Gavel, Inbox, Megaphone, MessageCircle, Plus } from "lucide-react"
import { Link } from "react-router"
import { api, useAuth, useFincas } from "@/lib/api"

export function DashboardPage() {
  const { user } = useAuth()
  const fincas = useFincas()
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api.get<GanaderoStats>("/ganadero/stats") })
  const consultas = useQuery({
    queryKey: ["consultas", "nueva"],
    queryFn: () => api.get<Consulta[]>("/ganadero/consultas?status=nueva"),
  })
  const s = stats.data
  const sinFinca = fincas.data && fincas.data.length === 0

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.name.split(" ")[0]}`}
        description="Así va tu ganado en el marketplace."
        actions={
          <Link to="/anuncios/nuevo" className={buttonVariants()}>
            <Plus /> Publicar ganado
          </Link>
        }
      />

      {sinFinca && (
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Fence className="size-5" />
          </span>
          <div className="flex-1">
            <p className="font-semibold">Primer paso: registra tu finca</p>
            <p className="text-sm text-muted-foreground">
              Cada anuncio se publica a nombre de una finca o hato. Con RIF y hierro registrado podemos
              verificarla y mostrar la insignia de confianza.
            </p>
          </div>
          <Link to="/fincas/nueva" className={buttonVariants()}>
            Registrar finca
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Publicados" value={s?.anunciosPublicados ?? "–"} icon={Megaphone} />
        <StatCard label="En revisión" value={s?.anunciosPendientes ?? "–"} icon={Clock} />
        <StatCard label="Visitas" value={s ? formatNumber(s.vistas) : "–"} icon={Eye} />
        <StatCard label="Clics WhatsApp" value={s?.whatsappClicks ?? "–"} icon={MessageCircle} />
        <StatCard label="Consultas nuevas" value={s?.consultasNuevas ?? "–"} icon={Inbox} />
        <StatCard label="Remates activos" value={s?.subastasActivas ?? "–"} icon={Gavel} />
      </div>

      <div className="mt-8 rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <p className="font-semibold">Consultas sin responder</p>
          <Link to="/consultas" className="text-sm font-medium text-primary hover:underline">
            Ver todas
          </Link>
        </div>
        {consultas.data?.length ? (
          <ul className="divide-y">
            {consultas.data.slice(0, 5).map((c) => (
              <li key={c.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {c.name} <span className="font-normal text-muted-foreground">sobre</span> {c.anuncioTitle}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{c.message}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                <StatusBadge status={c.status} label={CONSULTA_STATUS_LABEL[c.status]} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn("px-5 py-8 text-center text-sm text-muted-foreground")}>
            No tienes consultas pendientes.
          </p>
        )}
      </div>
    </>
  )
}
