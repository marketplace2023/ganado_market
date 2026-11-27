import * as React from "react"
import {
  MODALIDAD_PRECIO_LABEL,
  URGENCIA_LABEL,
  estadoName,
  formatDate,
  formatNumber,
  formatUsd,
  type Solicitud,
} from "@workspace/shared"
import { MapPin, Scale, ShieldCheck, Users, Wallet } from "lucide-react"
import { StatusBadge } from "./form-field"

function rango(min: number | null, max: number | null, fmt: (n: number) => string) {
  if (min && max) return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`
  if (min) return `desde ${fmt(min)}`
  if (max) return `hasta ${fmt(max)}`
  return null
}

/** Tarjeta de una solicitud de compra (web pública y panel ganadero). `action` = botón de contacto. */
export function SolicitudCard({ solicitud: s, action }: { solicitud: Solicitud; action?: React.ReactNode }) {
  const presupuesto = rango(s.presupuestoMinUsd, s.presupuestoMaxUsd, formatUsd)
  const peso = rango(s.pesoMinKg, s.pesoMaxKg, (n) => `${formatNumber(n)} kg`)
  return (
    <article className="flex flex-col rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <StatusBadge status={s.urgencia} label={URGENCIA_LABEL[s.urgencia]} />
        {s.especieName && <span className="font-medium text-primary">{s.especieName}</span>}
        <span className="ml-auto text-muted-foreground">{formatDate(s.createdAt)}</span>
      </div>
      <p className="mt-2 font-semibold leading-snug">{s.title}</p>
      {s.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
      <dl className="mt-3 space-y-1.5 text-sm">
        {presupuesto && (
          <div className="flex items-center gap-2">
            <Wallet className="size-4 shrink-0 text-muted-foreground" />
            <dt className="sr-only">Presupuesto</dt>
            <dd className="font-medium">
              {presupuesto}
              {s.modalidadPrecio && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">{MODALIDAD_PRECIO_LABEL[s.modalidadPrecio]}</span>
              )}
            </dd>
          </div>
        )}
        {(s.cantidad || peso) && (
          <div className="flex items-center gap-2">
            <Scale className="size-4 shrink-0 text-muted-foreground" />
            <dt className="sr-only">Cantidad y peso</dt>
            <dd>{[s.cantidad ? `${formatNumber(s.cantidad)} cabezas` : null, peso].filter(Boolean).join(" · ")}</dd>
          </div>
        )}
        {s.estado && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <dt className="sr-only">Ubicación</dt>
            <dd>{estadoName(s.estado)}</dd>
          </div>
        )}
      </dl>
      <div className="mt-auto pt-4">
      <div className="flex items-center gap-2 border-t pt-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
          {s.autorIniciales}
        </span>
        <div className="min-w-0 flex-1 text-xs">
          <p className="font-medium">{s.autorAlias}</p>
          <p className="flex items-center gap-1 text-muted-foreground">
            <ShieldCheck className="size-3" /> Identidad protegida
            {s.contactosCount > 0 && (
              <>
                {" · "}
                <Users className="size-3" /> {s.contactosCount}
              </>
            )}
          </p>
        </div>
        {action}
      </div>
      </div>
    </article>
  )
}
