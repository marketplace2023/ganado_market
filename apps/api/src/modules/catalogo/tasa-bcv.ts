/**
 * Tasa oficial BCV (Bs. por USD).
 * Fuente principal: ve.dolarapi.com (JSON). Respaldo: la portada de bcv.org.ve (#dolar strong).
 * Las dos devuelven el mismo valor oficial; si ambas fallan se conserva la última tasa guardada.
 */
const UA = "GanadoMarket/1.0 (+tasa BCV)"

async function fromDolarApi(): Promise<number> {
  const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`dolarapi ${res.status}`)
  const data = (await res.json()) as { promedio?: number | null; venta?: number | null }
  const value = Number(data.promedio ?? data.venta)
  if (!Number.isFinite(value) || value <= 0) throw new Error("dolarapi sin valor")
  return value
}

async function fromBcv(): Promise<number> {
  const res = await fetch("https://www.bcv.org.ve/", {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`bcv ${res.status}`)
  const html = await res.text()
  const match = html.match(/id="dolar"[\s\S]*?<strong[^>]*>\s*([\d.,]+)\s*<\/strong>/)
  if (!match) throw new Error("bcv: no se encontró el valor del dólar")
  // Formato venezolano: 924,35340000 (coma decimal, punto de miles)
  const value = Number(match[1].replace(/\./g, "").replace(",", "."))
  if (!Number.isFinite(value) || value <= 0) throw new Error("bcv: valor inválido")
  return value
}

export async function fetchTasaBcv(): Promise<number> {
  try {
    return await fromDolarApi()
  } catch (primary) {
    try {
      return await fromBcv()
    } catch (fallback) {
      throw new Error(`No se pudo obtener la tasa BCV (${(primary as Error).message}; ${(fallback as Error).message})`)
    }
  }
}
