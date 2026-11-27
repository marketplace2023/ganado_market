import { MODALIDAD_PRECIO_LABEL, formatBs, formatUsd, usdToBs, type ModalidadPrecio } from "@workspace/shared"
import { cn } from "cn"
import { useSettings } from "@/lib/api"

/** Precio en USD (referencia habitual del mercado ganadero) + equivalente en Bs. a tasa BCV. */
export function Precio({
  usd,
  modalidad,
  size = "md",
}: {
  usd: number
  modalidad?: ModalidadPrecio
  size?: "sm" | "md" | "lg"
}) {
  const { data: settings } = useSettings()
  const tasa = settings?.tasaBcv ?? 0
  return (
    <div>
      <p
        className={cn(
          "font-semibold tracking-tight tabular-nums",
          size === "sm" && "text-lg",
          size === "md" && "text-xl",
          size === "lg" && "text-3xl"
        )}
      >
        {formatUsd(usd)}
        {modalidad && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {MODALIDAD_PRECIO_LABEL[modalidad]}
          </span>
        )}
      </p>
      {tasa > 0 && (
        <p className="text-xs text-muted-foreground tabular-nums">≈ {formatBs(usdToBs(usd, tasa))} (BCV)</p>
      )}
    </div>
  )
}
