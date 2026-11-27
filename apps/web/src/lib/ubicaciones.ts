import {
  estadoName,
  type AnuncioCard,
  type Coordenadas,
  type FincaEnDirectorio,
} from "@workspace/shared"
import data from "./ubicaciones-venezuela.json"

type Ubicacion = {
  estado: string
  municipio: string
  ubicacionPublica: Coordenadas | null
}

export type PuntoMapa = {
  id: number
  titulo: string
  href: string
  foto: string | null
  posicion: [number, number]
  precision: "publica" | "municipio" | "estado"
  lugar: string
}

type PuntoSinUbicacion = Omit<PuntoMapa, "posicion" | "precision" | "lugar">

// Centros administrativos de GeoNames (CC BY 4.0). Ver docs/tecnico.md.
const estados: Record<string, number[]> = data.estados
const municipios: Record<string, Record<string, number[]>> = data.municipios

function normalizarMunicipio(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^municipio /, "")
}

export function puntoMapa(
  result: PuntoSinUbicacion & Ubicacion
): PuntoMapa | null {
  const { estado, municipio, ubicacionPublica, id, titulo, href, foto } = result
  const punto = { id, titulo, href, foto }
  const lugar = `${municipio}, ${estadoName(estado)}`
  if (ubicacionPublica) {
    return {
      ...punto,
      posicion: [ubicacionPublica.latitud, ubicacionPublica.longitud],
      precision: "publica",
      lugar,
    }
  }
  const municipioCentro = municipios[estado]?.[normalizarMunicipio(municipio)]
  if (Array.isArray(municipioCentro)) {
    return {
      ...punto,
      posicion: [municipioCentro[0], municipioCentro[1]],
      precision: "municipio",
      lugar,
    }
  }
  const estadoCentro = estados[estado]
  if (Array.isArray(estadoCentro)) {
    return {
      ...punto,
      posicion: [estadoCentro[0], estadoCentro[1]],
      precision: "estado",
      lugar: estadoName(estado),
    }
  }
  return null
}

export const precisionMapa: Record<PuntoMapa["precision"], string> = {
  publica: "Punto publicado por la finca",
  municipio: "Ubicación aproximada del municipio",
  estado: "Ubicación aproximada del estado",
}

export function puntoAnuncio(anuncio: AnuncioCard) {
  return puntoMapa({
    ...anuncio,
    titulo: anuncio.title,
    href: `/ganado/${anuncio.slug}`,
    foto: anuncio.thumbnailUrl,
  })
}

export function puntoFinca(finca: Omit<FincaEnDirectorio, "anunciosCount">) {
  return puntoMapa({
    ...finca,
    titulo: finca.name,
    href: `/fincas/${finca.slug}`,
    foto: finca.logoUrl,
  })
}
