import { SUBASTA_STATUS_LABEL, estadoName, formatDateTime, type SubastaCard } from "@workspace/shared"
import { StatusBadge } from "@workspace/ui/components/form-field"
import { Gavel, MapPin, Timer } from "lucide-react"
import { Link } from "react-router"
import { countdown, useNow } from "@/lib/use-now"

export function SubastaCardView({ subasta }: { subasta: SubastaCard }) {
  const now = useNow(1000)
  const enVivo = subasta.status === "en_vivo"
  return (
    <Link
      to={`/subastas/${subasta.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:shadow-md"
    >
      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
        {subasta.coverUrl ? (
          <img src={subasta.coverUrl} alt="" className="absolute inset-0 size-full object-cover opacity-60" />
        ) : (
          <Gavel className="size-10 opacity-70" />
        )}
        <span className="absolute top-2 left-2">
          <StatusBadge status={subasta.status} label={SUBASTA_STATUS_LABEL[subasta.status]} />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 font-semibold group-hover:underline">{subasta.title}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5" /> {subasta.fincaName} · {estadoName(subasta.estado)}
        </p>
        <div className="mt-auto flex items-center justify-between pt-4 text-sm">
          <span className="text-muted-foreground">{subasta.lotesCount} lotes</span>
          <span className="inline-flex items-center gap-1 font-medium tabular-nums">
            <Timer className="size-4 text-primary" />
            {enVivo
              ? `Cierra en ${countdown(subasta.endsAt, now)}`
              : subasta.status === "programada"
                ? `Inicia ${formatDateTime(subasta.startsAt)}`
                : `Cerró ${formatDateTime(subasta.endsAt)}`}
          </span>
        </div>
      </div>
    </Link>
  )
}
