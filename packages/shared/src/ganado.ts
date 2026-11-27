/**
 * Taxonomía ganadera adaptada a Venezuela.
 * Referencia de estructura: suganado.com (razas agrupadas por propósito, anuncio por
 * ejemplar o lote, sexo, peso, negociable). Se adapta con términos del llano venezolano
 * (maute/mauta, padrote, vaca parida) y razas criollas (Carora, Criollo Limonero).
 */

export const PROPOSITOS = ["carne", "leche", "doble_proposito", "trabajo", "cria"] as const
export type Proposito = (typeof PROPOSITOS)[number]
export const PROPOSITO_LABEL: Record<Proposito, string> = {
  carne: "Carne",
  leche: "Leche",
  doble_proposito: "Doble propósito",
  trabajo: "Trabajo / silla",
  cria: "Cría",
}

type RazaSeed = { slug: string; name: string; proposito: Proposito | null }
type EspecieSeed = { slug: string; name: string; icon: string; razas: RazaSeed[] }

/** Datos iniciales de especies y razas (los consume el seed del API). */
export const ESPECIES_SEED: EspecieSeed[] = [
  {
    slug: "bovino",
    name: "Bovinos",
    icon: "beef",
    razas: [
      { slug: "brahman", name: "Brahman", proposito: "carne" },
      { slug: "brahman-rojo", name: "Brahman Rojo", proposito: "carne" },
      { slug: "nelore", name: "Nelore", proposito: "carne" },
      { slug: "guzerat", name: "Guzerat", proposito: "doble_proposito" },
      { slug: "gyr", name: "Gyr", proposito: "leche" },
      { slug: "girolando", name: "Girolando", proposito: "leche" },
      { slug: "carora", name: "Carora", proposito: "leche" },
      { slug: "criollo-limonero", name: "Criollo Limonero", proposito: "doble_proposito" },
      { slug: "holstein", name: "Holstein", proposito: "leche" },
      { slug: "pardo-suizo", name: "Pardo Suizo", proposito: "doble_proposito" },
      { slug: "jersey", name: "Jersey", proposito: "leche" },
      { slug: "simmental", name: "Simmental", proposito: "doble_proposito" },
      { slug: "simbrah", name: "Simbrah", proposito: "doble_proposito" },
      { slug: "senepol", name: "Senepol", proposito: "carne" },
      { slug: "angus", name: "Angus", proposito: "carne" },
      { slug: "brangus", name: "Brangus", proposito: "carne" },
      { slug: "beefmaster", name: "Beefmaster", proposito: "carne" },
      { slug: "romosinuano", name: "Romosinuano", proposito: "carne" },
      { slug: "charolais", name: "Charolais", proposito: "carne" },
      { slug: "mestizo-carne", name: "Mestizo de carne", proposito: "carne" },
      { slug: "mestizo-leche", name: "Mestizo lechero", proposito: "leche" },
      { slug: "mestizo-doble-proposito", name: "Mestizo doble propósito", proposito: "doble_proposito" },
    ],
  },
  {
    slug: "bufalino",
    name: "Búfalos",
    icon: "bufalo",
    razas: [
      { slug: "murrah", name: "Murrah", proposito: "leche" },
      { slug: "mediterraneo", name: "Mediterráneo", proposito: "doble_proposito" },
      { slug: "jafarabadi", name: "Jafarabadi", proposito: "carne" },
      { slug: "bufalo-mestizo", name: "Búfalo mestizo", proposito: "doble_proposito" },
    ],
  },
  {
    slug: "equino",
    name: "Equinos",
    icon: "horse",
    razas: [
      { slug: "criollo-venezolano", name: "Criollo venezolano", proposito: "trabajo" },
      { slug: "cuarto-de-milla", name: "Cuarto de Milla", proposito: "trabajo" },
      { slug: "paso-fino", name: "Paso Fino", proposito: "trabajo" },
      { slug: "pura-sangre", name: "Pura Sangre", proposito: "trabajo" },
      { slug: "mular", name: "Mular / Asnal", proposito: "trabajo" },
    ],
  },
  {
    slug: "porcino",
    name: "Porcinos",
    icon: "pig",
    razas: [
      { slug: "landrace", name: "Landrace", proposito: "carne" },
      { slug: "large-white", name: "Large White", proposito: "carne" },
      { slug: "duroc", name: "Duroc", proposito: "carne" },
      { slug: "pietrain", name: "Pietrain", proposito: "carne" },
      { slug: "porcino-mestizo", name: "Porcino mestizo", proposito: "carne" },
    ],
  },
  {
    slug: "ovino",
    name: "Ovinos",
    icon: "sheep",
    razas: [
      { slug: "west-african", name: "West African (Pelibuey)", proposito: "carne" },
      { slug: "dorper", name: "Dorper", proposito: "carne" },
      { slug: "santa-ines", name: "Santa Inés", proposito: "carne" },
      { slug: "katahdin", name: "Katahdin", proposito: "carne" },
    ],
  },
  {
    slug: "caprino",
    name: "Caprinos",
    icon: "goat",
    razas: [
      { slug: "nubian", name: "Nubian (Anglo Nubian)", proposito: "doble_proposito" },
      { slug: "alpina", name: "Alpina", proposito: "leche" },
      { slug: "saanen", name: "Saanen", proposito: "leche" },
      { slug: "boer", name: "Boer", proposito: "carne" },
      { slug: "criollo-caprino", name: "Criollo (Lara / Falcón)", proposito: "doble_proposito" },
    ],
  },
]

/** Clase/etapa del animal, con nombres del llano venezolano. */
export const CATEGORIAS_ANIMAL = [
  "becerro",
  "becerra",
  "maute",
  "mauta",
  "novillo",
  "novilla",
  "torete",
  "toro",
  "padrote",
  "vaca",
  "vaca_prenada",
  "vaca_parida",
  "otro",
] as const
export type CategoriaAnimal = (typeof CATEGORIAS_ANIMAL)[number]
export const CATEGORIA_ANIMAL_LABEL: Record<CategoriaAnimal, string> = {
  becerro: "Becerro",
  becerra: "Becerra",
  maute: "Maute",
  mauta: "Mauta",
  novillo: "Novillo",
  novilla: "Novilla",
  torete: "Torete",
  toro: "Toro",
  padrote: "Padrote (reproductor)",
  vaca: "Vaca",
  vaca_prenada: "Vaca preñada",
  vaca_parida: "Vaca parida (con cría)",
  otro: "Otro",
}

/** Ejemplar = un animal; lote = varios animales; genética = semen / embriones. */
export const TIPOS_ANUNCIO = ["ejemplar", "lote", "genetica"] as const
export type TipoAnuncio = (typeof TIPOS_ANUNCIO)[number]
export const TIPO_ANUNCIO_LABEL: Record<TipoAnuncio, string> = {
  ejemplar: "Ejemplar",
  lote: "Lote",
  genetica: "Genética (semen / embriones)",
}

export const SEXOS = ["macho", "hembra", "mixto"] as const
export type Sexo = (typeof SEXOS)[number]
export const SEXO_LABEL: Record<Sexo, string> = {
  macho: "Macho",
  hembra: "Hembra",
  mixto: "Mixto",
}

/** En Venezuela el ganado se negocia por cabeza o por kilo en pie, normalmente en USD. */
export const MODALIDADES_PRECIO = ["por_cabeza", "por_kg", "por_lote"] as const
export type ModalidadPrecio = (typeof MODALIDADES_PRECIO)[number]
export const MODALIDAD_PRECIO_LABEL: Record<ModalidadPrecio, string> = {
  por_cabeza: "por cabeza",
  por_kg: "por kg en pie",
  por_lote: "por lote",
}

export const TIPOS_SERVICIO = [
  "transporte",
  "veterinario",
  "asesoria",
  "inseminacion",
  "alimento",
] as const
export type TipoServicio = (typeof TIPOS_SERVICIO)[number]
export const TIPO_SERVICIO_LABEL: Record<TipoServicio, string> = {
  transporte: "Transporte de ganado",
  veterinario: "Médico veterinario",
  asesoria: "Asesoría técnica",
  inseminacion: "Inseminación / genética",
  alimento: "Alimento y suplementos",
}
