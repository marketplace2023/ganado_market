import { useQuery } from "@tanstack/react-query"
import {
  CONSULTA_STATUS_LABEL,
  formatDateTime,
  formatNumber,
  type Consulta,
  type GanaderoStats,
} from "@workspace/shared"
import { BackgroundGradient } from "@workspace/ui/components/background-gradient"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { StatCard } from "@workspace/ui/components/dashboard-shell"
import { StatusBadge } from "@workspace/ui/components/form-field"
import { GridPattern } from "@workspace/ui/components/grid-pattern"
import { NumberTicker } from "@workspace/ui/components/number-ticker"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "cn"
import {
  ArrowRight,
  Clock,
  Eye,
  Fence,
  Gavel,
  Inbox,
  Megaphone,
  MessageCircle,
  Plus,
} from "lucide-react"
import { Link } from "react-router"
import { api, useAuth, useFincas } from "@/lib/api"

const fincaImage = new URL(
  "../../../api/assets/demo-images/finca-el-porvenir.webp",
  import.meta.url
).href

export function DashboardPage() {
  const { user } = useAuth()
  const fincas = useFincas()
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<GanaderoStats>("/ganadero/stats"),
  })
  const consultas = useQuery({
    queryKey: ["consultas", "nueva"],
    queryFn: () => api.get<Consulta[]>("/ganadero/consultas?status=nueva"),
  })
  const s = stats.data
  const sinFinca = fincas.data && fincas.data.length === 0

  return (
    <div className="space-y-7">
      <BackgroundGradient className="brand-surface isolate overflow-hidden">
        <img
          src={fincaImage}
          alt=""
          className="absolute inset-y-0 right-0 -z-20 hidden h-full w-[61%] object-cover object-center sm:block"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#34251c_30%,#34251ce6_44%,#34251c33_90%)]"
        />
        <GridPattern
          size={32}
          className="mask-[linear-gradient(to_right,#000,transparent_62%)] text-white/18"
        />
        <div className="relative max-w-xl p-6 sm:p-9 lg:p-10">
          <p className="mb-2 text-sm font-semibold text-[#f5d193]">
            Panel del ganadero
          </p>
          <h1 className="font-heading text-4xl leading-none font-semibold tracking-tight text-balance sm:text-5xl">
            {user
              ? `Hola, ${user.name.split(" ")[0]}`
              : "Tu operación ganadera"}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/85 sm:text-base">
            Publica tus lotes, atiende consultas y lleva el pulso de tus fincas.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to={sinFinca ? "/fincas/nueva" : "/anuncios/nuevo"}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-10 bg-[#f5d193] px-4 text-[#35251a] hover:bg-[#ffe3ab]"
              )}
            >
              <Plus /> {sinFinca ? "Registrar finca" : "Publicar ganado"}
            </Link>
            <Link
              to="/fincas"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-10 border-white/35 bg-[#34251c99] text-white hover:bg-[#493528] hover:text-white"
              )}
            >
              Mis fincas <ArrowRight />
            </Link>
          </div>
        </div>
      </BackgroundGradient>

      {sinFinca && (
        <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-card p-5 sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Fence className="size-5" />
          </span>
          <div className="flex-1">
            <p className="font-semibold">Registra tu primera finca</p>
            <p className="text-sm text-muted-foreground">
              Cada anuncio se publica a nombre de una finca o hato. Con RIF y
              hierro registrado podemos verificarla y mostrar la insignia de
              confianza.
            </p>
          </div>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_minmax(0,1fr)]">
        <section aria-labelledby="actividad-ganadera">
          <h2
            id="actividad-ganadera"
            className="mb-3 font-heading text-2xl font-semibold"
          >
            Actividad de tus anuncios
          </h2>
          {stats.isError ? (
            <div className="rounded-xl border bg-card p-4 text-sm">
              <p className="mb-3">No pudimos cargar la actividad.</p>
              <Button variant="outline" onClick={() => stats.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard
                label="Publicados"
                value={s ? <NumberTicker value={s.anunciosPublicados} /> : "—"}
                icon={Megaphone}
              />
              <StatCard
                label="En revisión"
                value={s?.anunciosPendientes ?? "—"}
                icon={Clock}
              />
              <StatCard
                label="Visitas"
                value={s ? formatNumber(s.vistas) : "—"}
                icon={Eye}
              />
              <StatCard
                label="Clics de WhatsApp"
                value={s?.whatsappClicks ?? "—"}
                icon={MessageCircle}
              />
              <StatCard
                label="Consultas nuevas"
                value={s?.consultasNuevas ?? "—"}
                icon={Inbox}
              />
              <StatCard
                label="Remates activos"
                value={s?.subastasActivas ?? "—"}
                icon={Gavel}
              />
            </div>
          )}
        </section>

        <section
          className="min-w-0 rounded-xl border bg-card"
          aria-labelledby="consultas-pendientes"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/45 px-5 py-4">
            <h2
              id="consultas-pendientes"
              className="font-heading text-xl font-semibold"
            >
              Consultas sin responder
            </h2>
            <Link
              to="/consultas"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              Ver todas <ArrowRight className="size-4" />
            </Link>
          </div>
          {consultas.isLoading ? (
            <div className="space-y-3 p-5" aria-label="Cargando consultas">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : consultas.isError ? (
            <div className="space-y-3 p-5 text-sm">
              <p>No pudimos cargar las consultas.</p>
              <Button variant="outline" onClick={() => consultas.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : consultas.data?.length ? (
            <ul className="divide-y">
              {consultas.data.slice(0, 5).map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <p className="text-sm font-medium">
                    {c.name}{" "}
                    <span className="font-normal text-muted-foreground">
                      sobre
                    </span>{" "}
                    {c.anuncioTitle}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {c.message}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(c.createdAt)}
                    </span>
                    <StatusBadge
                      status={c.status}
                      label={CONSULTA_STATUS_LABEL[c.status]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
              <Inbox className="mt-0.5 size-5 shrink-0 text-primary" />
              <p>No tienes consultas pendientes.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
