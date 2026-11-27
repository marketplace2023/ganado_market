import { MODALIDAD_PRECIO_LABEL, type ModalidadPrecio } from "./ganado.js"
import { normalizarTelefono } from "./venezuela.js"

const usd = new Intl.NumberFormat("es-VE", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "narrowSymbol",
  maximumFractionDigits: 2,
})
const bs = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 2, minimumFractionDigits: 2 })
const num = new Intl.NumberFormat("es-VE")

export const formatUsd = (value: number) => usd.format(value)
export const formatBs = (value: number) => `Bs. ${bs.format(value)}`
export const formatNumber = (value: number) => num.format(value)

/** Equivalente en bolívares usando la tasa BCV configurada por el admin. */
export function usdToBs(valueUsd: number, tasaBcv: number) {
  return valueUsd * tasaBcv
}

export function precioLabel(precioUsd: number, modalidad: ModalidadPrecio) {
  return `${formatUsd(precioUsd)} ${MODALIDAD_PRECIO_LABEL[modalidad]}`
}

/** Link wa.me con mensaje prellenado. Devuelve null si el teléfono no es válido. */
export function whatsappUrl(phone: string, message?: string) {
  const normalized = normalizarTelefono(phone)
  if (!normalized) return null
  const text = message ? `?text=${encodeURIComponent(message)}` : ""
  return `https://wa.me/${normalized}${text}`
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}
