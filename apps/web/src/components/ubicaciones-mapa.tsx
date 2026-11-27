import { divIcon, latLngBounds, type Marker as LeafletMarker } from "leaflet"
import { useEffect, useMemo, useRef } from "react"
import { Link } from "react-router"
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet"
import { precisionMapa, type PuntoMapa } from "@/lib/ubicaciones"
import "leaflet/dist/leaflet.css"

const centroVenezuela: [number, number] = [7.25, -66.6]
const tiles =
  import.meta.env.VITE_MAP_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
const creditos =
  import.meta.env.VITE_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export type EnfoqueMapa = { id: number }

export type UbicacionesMapaProps = {
  puntos: PuntoMapa[]
  enfoque?: EnfoqueMapa | null
  onMostrarResultado?: (id: number) => void
  onSeleccionar?: (id: number) => void
}

function zoomPara(punto: PuntoMapa) {
  return punto.precision === "publica"
    ? 14
    : punto.precision === "municipio"
      ? 10
      : 7
}

function Encuadre({
  puntos,
  enfoque,
}: Pick<UbicacionesMapaProps, "puntos" | "enfoque">) {
  const mapa = useMap()
  useEffect(() => {
    const contenedor = mapa.getContainer()
    let encuadrado = false
    function ajustar() {
      if (!contenedor.clientWidth || !contenedor.clientHeight) return
      mapa.invalidateSize({ pan: false })
      if (encuadrado) return
      encuadrado = true
      const enfocado = puntos.find((p) => p.id === enfoque?.id)
      if (enfocado) {
        mapa.setView(enfocado.posicion, zoomPara(enfocado), { animate: false })
        return
      }
      const bounds = latLngBounds(puntos.map((p) => p.posicion))
      if (!bounds.isValid()) return
      const mismoPunto = bounds.getNorthWest().equals(bounds.getSouthEast())
      mapa.fitBounds(bounds, {
        animate: false,
        padding: [36, 48],
        maxZoom: mismoPunto ? Math.min(...puntos.map(zoomPara)) : 10,
      })
    }
    ajustar()
    const observer = new ResizeObserver(ajustar)
    observer.observe(contenedor)
    return () => observer.disconnect()
  }, [mapa, puntos, enfoque])
  return null
}

function iconoPunto(puntos: PuntoMapa[]) {
  const primero = puntos[0]
  const icono = document.createElement("span")
  const exacto = puntos.every((p) => p.precision === "publica")
  icono.className = `relative flex size-10 items-center justify-center rounded-full border-2 shadow-md ${
    exacto
      ? "border-white bg-emerald-800 text-white"
      : "border-emerald-700 bg-white text-emerald-950"
  }`
  const inicial = document.createElement("span")
  inicial.className = "text-sm font-bold"
  inicial.textContent = primero.titulo.trim()[0]?.toUpperCase() ?? "•"
  icono.append(inicial)
  if (primero.foto) {
    const foto = document.createElement("img")
    foto.className = "absolute inset-0 size-full rounded-full object-cover"
    foto.alt = ""
    foto.addEventListener("error", () => foto.remove(), { once: true })
    foto.src = primero.foto
    icono.append(foto)
  }
  if (puntos.length > 1) {
    const cantidad = document.createElement("span")
    cantidad.className =
      "absolute -top-1 -right-2 min-w-5 rounded-full bg-emerald-900 px-1 text-center text-[11px] font-bold text-white ring-1 ring-white"
    cantidad.textContent = String(puntos.length)
    icono.append(cantidad)
  }
  return divIcon({
    html: icono,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -15],
  })
}

function GrupoMarcador({
  puntos,
  enfoque,
  onMostrarResultado,
  onSeleccionar,
}: UbicacionesMapaProps) {
  const marcador = useRef<LeafletMarker>(null)
  const primero = puntos[0]
  const icono = useMemo(() => iconoPunto(puntos), [puntos])
  const enfocado = puntos.find((p) => p.id === enfoque?.id)

  useEffect(() => {
    if (!enfocado) return
    marcador.current?.openPopup()
  }, [enfocado, enfoque])

  return (
    <Marker
      ref={marcador}
      position={primero.posicion}
      icon={icono}
      title={
        puntos.length === 1
          ? primero.titulo
          : `${puntos.length} resultados en ${primero.lugar}`
      }
      eventHandlers={{ click: () => onSeleccionar?.(primero.id) }}
    >
      <Popup maxWidth={280} minWidth={170}>
        <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
          {puntos.map((p) => (
            <li key={p.id} className="border-b pb-2 last:border-0 last:pb-0">
              {onMostrarResultado ? (
                <Link className="font-semibold hover:underline" to={p.href}>
                  {p.titulo}
                </Link>
              ) : (
                <span className="font-semibold">{p.titulo}</span>
              )}
              <div>{p.lugar}</div>
              <div className="text-xs text-neutral-600">
                {precisionMapa[p.precision]}
              </div>
              {onMostrarResultado && (
                <button
                  type="button"
                  onClick={() => onMostrarResultado(p.id)}
                  className="mt-1 font-medium text-emerald-800 underline"
                >
                  Mostrar en lista
                </button>
              )}
            </li>
          ))}
        </ul>
      </Popup>
    </Marker>
  )
}

export default function UbicacionesMapa({
  puntos,
  ...acciones
}: UbicacionesMapaProps) {
  const grupos = useMemo(() => {
    const agrupados = new Map<string, PuntoMapa[]>()
    for (const punto of puntos) {
      const clave = punto.posicion.join(",")
      const grupo = agrupados.get(clave)
      if (grupo) grupo.push(punto)
      else agrupados.set(clave, [punto])
    }
    return Array.from(agrupados.entries())
  }, [puntos])
  const attribution = puntos.some((p) => p.precision !== "publica")
    ? `${creditos} · <a href="https://www.geonames.org/export/">GeoNames</a>`
    : creditos

  return (
    <MapContainer
      center={centroVenezuela}
      zoom={5}
      scrollWheelZoom={false}
      className="size-full"
    >
      <TileLayer url={tiles} attribution={attribution} />
      <Encuadre puntos={puntos} enfoque={acciones.enfoque} />
      {grupos.map(([clave, grupo]) => (
        <GrupoMarcador key={clave} puntos={grupo} {...acciones} />
      ))}
    </MapContainer>
  )
}
