import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"
import {
  ESTADOS_VENEZUELA,
  URGENCIAS,
  URGENCIA_LABEL,
  toQuery,
  whatsappUrl,
  type Paginated,
  type Solicitud,
  type SolicitudContacto,
} from "@workspace/shared"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { EmptyState, PageHeader } from "@workspace/ui/components/dashboard-shell"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { SolicitudCard } from "@workspace/ui/components/solicitud-card"
import { cn } from "cn"
import { ClipboardList, Mail, MessageCircle } from "lucide-react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { api, useEspecies } from "@/lib/api"

export function SolicitudesPage() {
  const [params, setParams] = useSearchParams()
  const { data: especies } = useEspecies()
  const especie = params.get("especie") ?? ""
  const estado = params.get("estado") ?? ""
  const urgencia = params.get("urgencia") ?? ""
  const { data, isLoading } = useQuery({
    queryKey: ["solicitudes", especie, estado, urgencia],
    queryFn: () => api.get<Paginated<Solicitud>>(`/solicitudes${toQuery({ especie, estado, urgencia, limit: 50 })}`),
    placeholderData: keepPreviousData,
  })
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next)
  }

  return (
    <>
      <PageHeader
        title="Solicitudes de compra"
        description="Compradores que buscan ganado ahora. Si tienes lo que piden, escríbeles directo: el comprador ve cuántos ganaderos lo contactaron."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <NativeSelect value={especie} onChange={(e) => set("especie", e.target.value)} aria-label="Especie">
          <NativeSelectOption value="">Todas las especies</NativeSelectOption>
          {especies?.map((e) => <NativeSelectOption key={e.slug} value={e.slug}>{e.name}</NativeSelectOption>)}
        </NativeSelect>
        <NativeSelect value={estado} onChange={(e) => set("estado", e.target.value)} aria-label="Estado">
          <NativeSelectOption value="">Toda Venezuela</NativeSelectOption>
          {ESTADOS_VENEZUELA.map((e) => <NativeSelectOption key={e.slug} value={e.slug}>{e.name}</NativeSelectOption>)}
        </NativeSelect>
        <NativeSelect value={urgencia} onChange={(e) => set("urgencia", e.target.value)} aria-label="Urgencia">
          <NativeSelectOption value="">Cualquier urgencia</NativeSelectOption>
          {URGENCIAS.map((u) => <NativeSelectOption key={u} value={u}>{URGENCIA_LABEL[u]}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      {isLoading ? null : data?.items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((s) => (
            <SolicitudCard key={s.id} solicitud={s} action={<VerContacto solicitud={s} />} />
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No hay solicitudes activas con esos filtros" />
      )}
    </>
  )
}

function VerContacto({ solicitud }: { solicitud: Solicitud }) {
  const ver = useMutation({
    mutationFn: () => api.get<SolicitudContacto>(`/solicitudes/${solicitud.id}/contacto`),
    onError: (e) => toast.error(e.message),
  })
  if (!ver.data) {
    return (
      <Button size="sm" onClick={() => ver.mutate()} disabled={ver.isPending}>
        Ver contacto
      </Button>
    )
  }
  const wa = ver.data.phone
    ? whatsappUrl(ver.data.phone, `Hola ${ver.data.name.split(" ")[0]}, vi tu solicitud "${solicitud.title}" en GanadoMarket. Tengo lo que buscas.`)
    : null
  return wa ? (
    <a href={wa} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }), "bg-[#25D366] text-white hover:bg-[#1fb857]")}>
      <MessageCircle /> WhatsApp
    </a>
  ) : (
    <a href={`mailto:${ver.data.email}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
      <Mail /> Correo
    </a>
  )
}
