import { db } from "#database/connection.ts"
import { settingsTable } from "#database/schemas/index.ts"
import type { PublicSettings, SettingsDto } from "@workspace/shared"
import { normalizarTelefono } from "@workspace/shared"
import { fetchTasaBcv } from "./tasa-bcv.ts"

export const SETTING_KEYS = {
  tasaBcv: "tasa_bcv",
  tasaAuto: "tasa_auto",
  whatsappSoporte: "whatsapp_soporte",
  emailSoporte: "email_soporte",
} as const

/** Con actualización automática, la tasa se refresca si tiene más de 3 horas. */
const TASA_MAX_AGE_MS = 3 * 60 * 60 * 1000

async function readSettings() {
  const rows = await db.select().from(settingsTable)
  return new Map(rows.map((r) => [r.key, r]))
}

async function upsert(key: string, value: string) {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } })
}

let refreshing: Promise<void> | null = null

/** Descarga la tasa y la guarda. Concurrente-seguro: varias peticiones comparten la misma descarga. */
export function refreshTasaBcv() {
  refreshing ??= fetchTasaBcv()
    .then((tasa) => upsert(SETTING_KEYS.tasaBcv, String(tasa)))
    .catch((err) => console.warn(`⚠️  ${(err as Error).message}`))
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

/** La tasa automática está activa salvo que el admin la haya desactivado. */
const isAuto = (s: Map<string, { value: string }>) => s.get(SETTING_KEYS.tasaAuto)?.value !== "0"

export async function getPublicSettings(): Promise<PublicSettings> {
  let byKey = await readSettings()
  const tasa = byKey.get(SETTING_KEYS.tasaBcv)
  const stale = !tasa || Number(tasa.value) <= 0 || Date.now() - tasa.updatedAt.getTime() > TASA_MAX_AGE_MS
  if (isAuto(byKey) && stale) {
    await refreshTasaBcv()
    byKey = await readSettings()
  }
  const current = byKey.get(SETTING_KEYS.tasaBcv)
  const value = Number(current?.value ?? 0) || 0
  return {
    tasaBcv: value,
    tasaActualizada: current && value > 0 ? current.updatedAt.toISOString() : null,
    tasaFuente: isAuto(byKey) ? "auto" : "manual",
    whatsappSoporte: byKey.get(SETTING_KEYS.whatsappSoporte)?.value ?? "",
    emailSoporte: byKey.get(SETTING_KEYS.emailSoporte)?.value ?? "",
  }
}

export async function saveSettings(dto: SettingsDto) {
  await upsert(SETTING_KEYS.tasaAuto, dto.tasaAuto ? "1" : "0")
  if (!dto.tasaAuto && dto.tasaBcv) await upsert(SETTING_KEYS.tasaBcv, String(dto.tasaBcv))
  if (dto.tasaAuto) await refreshTasaBcv()
  await upsert(SETTING_KEYS.whatsappSoporte, normalizarTelefono(dto.whatsappSoporte) ?? "")
  await upsert(SETTING_KEYS.emailSoporte, dto.emailSoporte ?? "")
  return getPublicSettings()
}
