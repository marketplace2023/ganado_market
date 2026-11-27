/**
 * Datos geográficos y de identificación de Venezuela.
 * Las 23 entidades estadales + Distrito Capital. El municipio se captura como texto libre.
 */
export const ESTADOS_VENEZUELA = [
  { slug: "amazonas", name: "Amazonas", region: "guayana" },
  { slug: "anzoategui", name: "Anzoátegui", region: "oriente" },
  { slug: "apure", name: "Apure", region: "llanos" },
  { slug: "aragua", name: "Aragua", region: "central" },
  { slug: "barinas", name: "Barinas", region: "llanos" },
  { slug: "bolivar", name: "Bolívar", region: "guayana" },
  { slug: "carabobo", name: "Carabobo", region: "central" },
  { slug: "cojedes", name: "Cojedes", region: "llanos" },
  { slug: "delta-amacuro", name: "Delta Amacuro", region: "guayana" },
  { slug: "distrito-capital", name: "Distrito Capital", region: "capital" },
  { slug: "falcon", name: "Falcón", region: "centro-occidente" },
  { slug: "guarico", name: "Guárico", region: "llanos" },
  { slug: "la-guaira", name: "La Guaira", region: "capital" },
  { slug: "lara", name: "Lara", region: "centro-occidente" },
  { slug: "merida", name: "Mérida", region: "andes" },
  { slug: "miranda", name: "Miranda", region: "capital" },
  { slug: "monagas", name: "Monagas", region: "oriente" },
  { slug: "nueva-esparta", name: "Nueva Esparta", region: "insular" },
  { slug: "portuguesa", name: "Portuguesa", region: "llanos" },
  { slug: "sucre", name: "Sucre", region: "oriente" },
  { slug: "tachira", name: "Táchira", region: "andes" },
  { slug: "trujillo", name: "Trujillo", region: "andes" },
  { slug: "yaracuy", name: "Yaracuy", region: "centro-occidente" },
  { slug: "zulia", name: "Zulia", region: "zuliana" },
] as const

export type EstadoSlug = (typeof ESTADOS_VENEZUELA)[number]["slug"]

export const ESTADO_SLUGS = ESTADOS_VENEZUELA.map((e) => e.slug) as [
  EstadoSlug,
  ...EstadoSlug[],
]

/** Estados con mayor tradición ganadera: se destacan en el home y en filtros rápidos. */
export const ESTADOS_GANADEROS: EstadoSlug[] = [
  "zulia",
  "apure",
  "barinas",
  "guarico",
  "tachira",
  "portuguesa",
  "cojedes",
  "monagas",
  "merida",
  "anzoategui",
]

export function estadoName(slug: string | null | undefined): string {
  if (!slug) return ""
  return ESTADOS_VENEZUELA.find((e) => e.slug === slug)?.name ?? slug
}

/** Cédula: V-12345678 / E-12345678 */
export const CEDULA_REGEX = /^[VE]-?\d{6,9}$/i
/** RIF: J-12345678-9, V-12345678-9, G-, E-, P- */
export const RIF_REGEX = /^[VJGEP]-?\d{8}-?\d$/i

/** Prefijos de operadoras móviles (Movilnet, Movistar, Digitel). */
export const PREFIJOS_MOVILES = ["0412", "0414", "0424", "0416", "0426", "0422"] as const

/** Acepta 0414-1234567, 04141234567, +58 414 1234567, 584141234567. */
export const TELEFONO_VE_REGEX = /^(?:\+?58|0)?4(?:12|14|24|16|26|22)\d{7}$/

/** Normaliza un teléfono venezolano al formato internacional sin "+" (584141234567). */
export function normalizarTelefono(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  let local: string
  if (digits.startsWith("58")) local = digits.slice(2)
  else if (digits.startsWith("0")) local = digits.slice(1)
  else local = digits
  if (!/^4(?:12|14|24|16|26|22)\d{7}$/.test(local)) return null
  return `58${local}`
}
