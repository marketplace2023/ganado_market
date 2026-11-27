import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ANUNCIO_STATUS,
  ANUNCIO_STATUS_LABEL,
  MODALIDADES_PRECIO,
  MODALIDAD_PRECIO_LABEL,
  formatNumber,
  formatUsd,
  reservaAnuncioDto,
  type AnuncioGanadero,
  type AnuncioStatus,
  type ReservaAnuncioDto,
} from "@workspace/shared"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { EmptyState, PageHeader } from "@workspace/ui/components/dashboard-shell"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { FormField, StatusBadge } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { cn } from "cn"
import {
  CalendarCheck,
  CheckCheck,
  ExternalLink,
  Eye,
  Inbox,
  Megaphone,
  MessageCircle,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Trash2,
} from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router"
import { toast } from "sonner"
import { WEB_URL, api } from "@/lib/api"
import { useSchemaForm } from "@/lib/form"

type Accion = "enviar" | "pausar" | "reactivar" | "vendido"

const fechaReserva = new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short" })
const RESULTADO_RESERVA = {
  liberada: "Reserva liberada",
  vencida: "Reserva vencida",
  vendida: "Venta registrada",
  retirada: "Reserva cerrada por moderación",
}

export function AnunciosPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get("status") ?? "") as AnuncioStatus | ""
  const qc = useQueryClient()
  const [lote, setLote] = useState<AnuncioGanadero | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ["anuncios"],
    queryFn: () => api.get<AnuncioGanadero[]>("/ganadero/anuncios"),
    refetchOnWindowFocus: "always",
    refetchInterval: ({ state }) => {
      const expiraciones = state.data?.flatMap((a) =>
        a.reservado && a.ultimaReserva ? [Date.parse(a.ultimaReserva.expiresAt)] : []
      )
      if (!expiraciones?.length) return false
      return Math.min(60_000, Math.max(1000, Math.min(...expiraciones) - Date.now()))
    },
  })
  const items = data?.filter((a) => !status || a.status === status) ?? []
  const counts = Object.fromEntries(ANUNCIO_STATUS.map((s) => [s, data?.filter((a) => a.status === s).length ?? 0]))

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["anuncios"] })
    qc.invalidateQueries({ queryKey: ["stats"] })
  }
  const cambiar = useMutation({
    mutationFn: ({ id, accion, reservaId }: { id: number; accion: Accion; reservaId?: number }) =>
      api.post(`/ganadero/anuncios/${id}/estado`, { accion, reservaId }),
    onSuccess: () => {
      toast.success("Anuncio actualizado")
      refresh()
    },
    onError: (e) => {
      toast.error(e.message)
      refresh()
    },
  })
  const liberar = useMutation({
    mutationFn: ({ id, reservaId }: { id: number; reservaId: number }) =>
      api.post(`/ganadero/anuncios/${id}/reservas/${reservaId}/liberar`),
    onSuccess: () => {
      toast.success("Reserva liberada")
      refresh()
    },
    onError: (e) => {
      toast.error(e.message)
      refresh()
    },
  })
  const eliminar = useMutation({
    mutationFn: (id: number) => api.del(`/ganadero/anuncios/${id}`),
    onSuccess: () => {
      toast.success("Anuncio eliminado")
      refresh()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <>
      <PageHeader
        title="Mis anuncios"
        description="Los anuncios nuevos o editados pasan por una revisión rápida antes de publicarse."
        actions={
          <Link to="/anuncios/nuevo" className={buttonVariants()}>
            <Plus /> Nuevo anuncio
          </Link>
        }
      />
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1">
        {(["", ...ANUNCIO_STATUS] as const).map((s) => (
          <button
            key={s || "todos"}
            onClick={() => setParams(s ? { status: s } : {})}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium",
              status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s ? ANUNCIO_STATUS_LABEL[s] : "Todos"}
            <span className="ml-1.5 opacity-60">{s ? counts[s] : (data?.length ?? 0)}</span>
          </button>
        ))}
      </div>

      {isLoading ? null : items.length ? (
        <div className="space-y-3">
          {items.map((a) => {
            const reservaId = a.reservado ? a.ultimaReserva?.id : undefined
            return (
              <div key={a.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:flex-row md:items-center">
                <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {a.thumbnailUrl && <img src={a.thumbnailUrl} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={a.status} label={ANUNCIO_STATUS_LABEL[a.status]} />
                    {a.reservado && (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                        Reservado
                      </span>
                    )}
                    {a.isFeatured && <span className="text-xs font-medium text-amber-600">★ Destacado</span>}
                  </div>
                  <p className="mt-1 truncate font-semibold">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.fincaName} · {formatUsd(a.precioUsd)} {MODALIDAD_PRECIO_LABEL[a.modalidadPrecio]} ·{" "}
                    {formatNumber(a.cantidad)} cab.
                  </p>
                  {a.ultimaReserva && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.ultimaReserva.resultado
                        ? RESULTADO_RESERVA[a.ultimaReserva.resultado]
                        : `Reservado hasta el ${fechaReserva.format(new Date(a.ultimaReserva.expiresAt))}`}
                      {" · "}{formatUsd(a.ultimaReserva.precioUsd)} {MODALIDAD_PRECIO_LABEL[a.ultimaReserva.modalidadPrecio]}
                    </p>
                  )}
                  {a.status === "rechazado" && a.rejectionReason && (
                    <p className="mt-2 rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-800">
                      Motivo del rechazo: {a.rejectionReason}
                    </p>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground md:w-44 md:justify-end">
                  <span className="inline-flex items-center gap-1" title="Visitas"><Eye className="size-4" />{a.viewCount}</span>
                  <span className="inline-flex items-center gap-1" title="Clics WhatsApp"><MessageCircle className="size-4" />{a.whatsappClicks}</span>
                  <span className="inline-flex items-center gap-1" title="Consultas"><Inbox className="size-4" />{a.consultasCount}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 md:w-auto md:justify-end">
                  {a.status === "publicado" && (
                    <a
                      href={`${WEB_URL}/ganado/${a.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                      title="Ver publicado"
                    >
                      <ExternalLink />
                    </a>
                  )}
                  {!a.reservado && (
                    <Link to={`/anuncios/${a.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <Pencil /> Editar
                    </Link>
                  )}
                  {a.status === "publicado" && a.tipo === "lote" && !a.reservado && (
                    <Button variant="outline" size="sm" onClick={() => setLote(a)}>
                      <CalendarCheck /> Reservar lote
                    </Button>
                  )}
                  {reservaId !== undefined && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={liberar.isPending}
                      onClick={() => liberar.mutate({ id: a.id, reservaId })}
                    >
                      Liberar reserva
                    </Button>
                  )}
                  {(a.status === "borrador" || a.status === "rechazado") && (
                    <Button size="sm" onClick={() => cambiar.mutate({ id: a.id, accion: "enviar" })}>
                      <Send /> Enviar a revisión
                    </Button>
                  )}
                  {a.status === "publicado" && (
                    <Button variant="outline" size="sm" onClick={() => cambiar.mutate({ id: a.id, accion: "pausar" })}>
                      <Pause /> Pausar
                    </Button>
                  )}
                  {a.status === "pausado" && (
                    <Button variant="outline" size="sm" onClick={() => cambiar.mutate({ id: a.id, accion: "reactivar" })}>
                      <Play /> Reactivar
                    </Button>
                  )}
                  {(a.status === "publicado" || a.status === "pausado") && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={cambiar.isPending}
                      onClick={() => cambiar.mutate({
                        id: a.id,
                        accion: "vendido",
                        reservaId,
                      })}
                    >
                      <CheckCheck /> Vendido
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Eliminar"
                    aria-label="Eliminar"
                    disabled={a.reservado}
                    onClick={() => confirm(`¿Eliminar "${a.title}"? Esta acción no se puede deshacer.`) && eliminar.mutate(a.id)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Megaphone}
          title={status ? `No tienes anuncios en “${ANUNCIO_STATUS_LABEL[status]}”` : "Aún no publicas ganado"}
          action={<Link to="/anuncios/nuevo" className={buttonVariants()}><Plus /> Publicar ganado</Link>}
        />
      )}
      {lote && <ReservaDialog anuncio={lote} cerrar={() => setLote(null)} actualizar={refresh} />}
    </>
  )
}

function ReservaDialog({
  anuncio,
  cerrar,
  actualizar,
}: {
  anuncio: AnuncioGanadero
  cerrar: () => void
  actualizar: () => void
}) {
  const [form, setForm] = useState(() => ({
    solicitudId: crypto.randomUUID(),
    precioUsd: "",
    modalidadPrecio: anuncio.modalidadPrecio as string,
    expiresAt: "",
  }))
  const { errors, validate, onServerError, clear } = useSchemaForm(reservaAnuncioDto)
  const reservar = useMutation({
    mutationFn: (dto: ReservaAnuncioDto) => api.post(`/ganadero/anuncios/${anuncio.id}/reservas`, dto),
    onSuccess: () => {
      toast.success("Reserva registrada")
      actualizar()
      cerrar()
    },
    onError: (error) => {
      onServerError(error)
      actualizar()
    },
  })

  function cambiar(campo: "precioUsd" | "modalidadPrecio" | "expiresAt", valor: string) {
    clear(campo)
    setForm((actual) => ({ ...actual, [campo]: valor, solicitudId: crypto.randomUUID() }))
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const fecha = new Date(form.expiresAt)
    const dto = validate({
      ...form,
      expiresAt: Number.isNaN(fecha.getTime()) ? "" : fecha.toISOString(),
    })
    if (dto && !reservar.isPending) reservar.mutate(dto)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !reservar.isPending) cerrar() }}>
      <DialogContent showCloseButton={!reservar.isPending}>
        <DialogHeader>
          <DialogTitle>Reservar lote</DialogTitle>
          <DialogDescription>
            {anuncio.title} · {formatNumber(anuncio.cantidad)} cab. El precio acordado es privado.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={guardar}>
          <FormField label="Precio acordado (USD)" error={errors.precioUsd} required>
            <Input type="number" min="0.01" step="0.01" required disabled={reservar.isPending}
              value={form.precioUsd} onChange={(e) => cambiar("precioUsd", e.target.value)} />
          </FormField>
          <FormField label="Unidad de precio" error={errors.modalidadPrecio} required>
            <NativeSelect value={form.modalidadPrecio} disabled={reservar.isPending}
              onChange={(e) => cambiar("modalidadPrecio", e.target.value)}>
              {MODALIDADES_PRECIO.map((unidad) => (
                <NativeSelectOption key={unidad} value={unidad}>{MODALIDAD_PRECIO_LABEL[unidad]}</NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Reservar hasta" hint={fechaReserva.resolvedOptions().timeZone} error={errors.expiresAt} required>
            <Input type="datetime-local" required disabled={reservar.isPending}
              value={form.expiresAt} onChange={(e) => cambiar("expiresAt", e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cerrar} disabled={reservar.isPending}>Cancelar</Button>
            <Button type="submit" disabled={reservar.isPending}>
              {reservar.isPending ? "Guardando…" : "Reservar lote"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
