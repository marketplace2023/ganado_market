import { cn } from "cn"
import { Beef, PawPrint } from "lucide-react"

const TINTS: Record<string, string> = {
  bovino: "from-emerald-100 to-lime-50 text-emerald-700",
  bufalino: "from-stone-200 to-stone-50 text-stone-600",
  equino: "from-amber-100 to-orange-50 text-amber-700",
  porcino: "from-rose-100 to-pink-50 text-rose-600",
  ovino: "from-sky-100 to-slate-50 text-sky-700",
  caprino: "from-yellow-100 to-amber-50 text-yellow-700",
}

/** Imagen de reemplazo cuando el anuncio aún no tiene fotos. */
export function AnimalPlaceholder({ especie, className }: { especie: string | null; className?: string }) {
  const Icon = especie === "bovino" || especie === "bufalino" ? Beef : PawPrint
  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center gap-1 bg-gradient-to-br",
        TINTS[especie ?? ""] ?? "from-muted to-background text-muted-foreground",
        className
      )}
    >
      <Icon className="size-10 opacity-60" strokeWidth={1.5} />
      <span className="text-[11px] font-medium opacity-70">Sin fotos</span>
    </div>
  )
}
