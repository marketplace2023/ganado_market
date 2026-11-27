import { useQuery } from "@tanstack/react-query"
import type { SubastaCard } from "@workspace/shared"
import { EmptyState } from "@workspace/ui/components/dashboard-shell"
import { cn } from "cn"
import { Gavel } from "lucide-react"
import { useSearchParams } from "react-router"
import { SubastaCardView } from "@/components/subasta-card"
import { GANADERO_URL, api } from "@/lib/api"

export function SubastasPage() {
  const [params, setParams] = useSearchParams()
  const filtro = params.get("filtro") === "finalizadas" ? "finalizadas" : "vigentes"
  const { data, isLoading } = useQuery({
    queryKey: ["subastas", filtro],
    queryFn: () => api.get<SubastaCard[]>(`/subastas?filtro=${filtro}`),
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Remates virtuales</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Puja por lotes desde cualquier estado del país. Cada remate es revisado antes de publicarse; las
        pujas en los últimos 2 minutos extienden el cierre para que nadie gane “a última hora”.
      </p>
      <div className="mt-6 mb-6 inline-flex rounded-lg border bg-card p-1">
        {(["vigentes", "finalizadas"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setParams(f === "vigentes" ? {} : { filtro: f })}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium capitalize",
              filtro === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "vigentes" ? "En vivo y próximos" : "Finalizados"}
          </button>
        ))}
      </div>
      {isLoading ? null : data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => <SubastaCardView key={s.id} subasta={s} />)}
        </div>
      ) : (
        <EmptyState
          icon={Gavel}
          title={filtro === "vigentes" ? "No hay remates programados" : "Aún no hay remates finalizados"}
          description="¿Quieres organizar un remate de tu finca? Créalo desde el panel del ganadero."
          action={<a className="text-sm font-medium text-primary hover:underline" href={`${GANADERO_URL}/subastas`}>Ir al panel</a>}
        />
      )}
    </div>
  )
}
