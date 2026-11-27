import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ANUNCIO_STATUS_LABEL,
  CATEGORIA_ANIMAL_LABEL,
  MODALIDAD_PRECIO_LABEL,
  SEXO_LABEL,
  TIPO_ANUNCIO_LABEL,
  estadoName,
  formatDate,
  formatNumber,
  formatUsd,
  toQuery,
  type AnuncioDetail,
  type AnuncioOwned,
  type AnuncioStatus,
  type Paginated,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { EmptyState, PageHeader } from "@workspace/ui/components/dashboard-shell"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { StatusBadge } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "cn"
import { BadgeCheck, Check, Eye, Megaphone, Star, X } from "lucide-react"
import { useState } from "react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { api } from "@/lib/api"

const MOTIVOS = [
  "Fotos que no corresponden a ganado real o tomadas de internet",
  "Precio irreal o información incompleta",
  "Datos de contacto en el título o la descripción",
  "Anuncio duplicado",
]

export function AnunciosPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get("status") ?? "pendiente") as AnuncioStatus | "todos"
  const q = params.get("q") ?? ""
  const qc = useQueryClient()
  const [preview, setPreview] = useState<number | null>(null)
  const [rechazar, setRechazar] = useState<AnuncioOwned | null>(null)

  const list = useQuery({
    queryKey: ["admin-anuncios", status, q],
    queryFn: () =>
      api.get<Paginated<AnuncioOwned>>(`/admin/anuncios${toQuery({ status: status === "todos" ? undefined : status, q, limit: 100 })}`),
    placeholderData: keepPreviousData,
  })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-anuncios"] })
    qc.invalidateQueries({ queryKey: ["stats"] })
  }
  const action = useMutation({
    mutationFn: ({ id, path, body }: { id: number; path: string; body?: object }) =>
      api.post(`/admin/anuncios/${id}/${path}`, body),
    onSuccess: (_d, v) => {
      toast.success({ aprobar: "Anuncio publicado", rechazar: "Anuncio rechazado", destacar: "Destacado actualizado" }[v.path] ?? "Listo")
      setPreview(null)
      setRechazar(null)
      refresh()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <>
      <PageHeader title="Moderación de anuncios" description="Revisa que fotos, precios y datos sanitarios sean coherentes antes de publicar." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1">
          {(["pendiente", "publicado", "rechazado", "pausado", "vendido", "borrador", "todos"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setParams({ ...(s !== "pendiente" && { status: s }), ...(q && { q }) })}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium",
                status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "todos" ? "Todos" : ANUNCIO_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <Input
          key={q}
          defaultValue={q}
          placeholder="Buscar por título o correo…"
          className="h-9 sm:max-w-xs"
          onKeyDown={(e) => e.key === "Enter" && setParams({ ...(status !== "pendiente" && { status }), ...(e.currentTarget.value && { q: e.currentTarget.value }) })}
        />
      </div>

      {list.data?.items.length ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Anuncio</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Ganadero</th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Precio</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.data.items.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.especieName} · {a.razaName ?? "Sin raza"} · {a.municipio}, {estadoName(a.estado)}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <p className="flex items-center gap-1">{a.fincaName}{a.fincaVerificada && <BadgeCheck className="size-3.5 text-sky-600" />}</p>
                    <p className="text-xs text-muted-foreground">{a.ownerEmail}</p>
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums lg:table-cell">
                    {formatUsd(a.precioUsd)} <span className="text-xs text-muted-foreground">{MODALIDAD_PRECIO_LABEL[a.modalidadPrecio]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} label={ANUNCIO_STATUS_LABEL[a.status]} />
                    {a.isFeatured && <Star className="ml-1 inline size-3.5 fill-amber-400 text-amber-400" />}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" title="Vista previa" aria-label="Vista previa" onClick={() => setPreview(a.id)}>
                        <Eye />
                      </Button>
                      {(a.status === "pendiente" || a.status === "rechazado") && (
                        <Button size="sm" onClick={() => action.mutate({ id: a.id, path: "aprobar" })}>
                          <Check /> Aprobar
                        </Button>
                      )}
                      {a.status !== "rechazado" && a.status !== "borrador" && (
                        <Button variant="outline" size="sm" onClick={() => setRechazar(a)}>
                          <X /> Rechazar
                        </Button>
                      )}
                      {a.status === "publicado" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={a.isFeatured ? "Quitar destacado" : "Destacar"}
                          aria-label="Destacar"
                          onClick={() => action.mutate({ id: a.id, path: "destacar" })}
                        >
                          <Star className={a.isFeatured ? "fill-amber-400 text-amber-400" : ""} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : list.isLoading ? null : (
        <EmptyState icon={Megaphone} title={status === "pendiente" ? "¡Todo al día! No hay anuncios por revisar." : "No hay anuncios en este estado"} />
      )}

      <PreviewDialog
        id={preview}
        onClose={() => setPreview(null)}
        onApprove={(id) => action.mutate({ id, path: "aprobar" })}
      />
      <RejectDialog
        anuncio={rechazar}
        onClose={() => setRechazar(null)}
        onConfirm={(id, reason) => action.mutate({ id, path: "rechazar", body: { reason } })}
        pending={action.isPending}
      />
    </>
  )
}

function PreviewDialog({ id, onClose, onApprove }: { id: number | null; onClose: () => void; onApprove: (id: number) => void }) {
  const { data: a } = useQuery({
    queryKey: ["admin-anuncio", id],
    queryFn: () => api.get<AnuncioDetail>(`/admin/anuncios/${id}`),
    enabled: id !== null,
  })
  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {a && (
          <>
            <DialogHeader>
              <DialogTitle>{a.title}</DialogTitle>
              <DialogDescription>
                {a.finca.name} · {a.municipio}, {estadoName(a.estado)} · {a.publishedAt ? `publicado el ${formatDate(a.publishedAt)}` : "aún sin publicar"}
              </DialogDescription>
            </DialogHeader>
            {a.media.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {a.media.map((m) => <img key={m.id} src={m.url} alt="" className="aspect-square rounded-lg object-cover" />)}
              </div>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">El anuncio no tiene fotos.</p>
            )}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {[
                ["Especie / raza", `${a.especieName} · ${a.razaName ?? "—"}`],
                ["Tipo", TIPO_ANUNCIO_LABEL[a.tipo]],
                ["Clase", a.categoriaAnimal ? CATEGORIA_ANIMAL_LABEL[a.categoriaAnimal] : "—"],
                ["Sexo / cantidad", `${SEXO_LABEL[a.sexo]} · ${formatNumber(a.cantidad)}`],
                ["Peso prom.", a.pesoPromedioKg ? `${a.pesoPromedioKg} kg` : "—"],
                ["Precio", `${formatUsd(a.precioUsd)} ${MODALIDAD_PRECIO_LABEL[a.modalidadPrecio]}`],
                ["Aftosa / brucelosis", `${a.vacunaAftosa ? "Sí" : "No"} / ${a.vacunaBrucelosis ? "Sí" : "No"}`],
                ["Desparasitado", a.desparasitado ? "Sí" : "No"],
                ["Guía de movilización", a.guiaMovilizacion ? "Sí" : "No"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b py-1">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {a.description && <p className="text-sm whitespace-pre-line text-foreground/85">{a.description}</p>}
            {a.status === "pendiente" && (
              <DialogFooter>
                <Button onClick={() => onApprove(a.id)}><Check /> Aprobar y publicar</Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({
  anuncio,
  onClose,
  onConfirm,
  pending,
}: {
  anuncio: AnuncioOwned | null
  onClose: () => void
  onConfirm: (id: number, reason: string) => void
  pending: boolean
}) {
  const [reason, setReason] = useState("")
  return (
    <Dialog open={anuncio !== null} onOpenChange={(o) => { if (!o) { onClose(); setReason("") } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rechazar anuncio</DialogTitle>
          <DialogDescription>El ganadero verá este motivo y podrá corregir y reenviar.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {MOTIVOS.map((m) => (
            <button key={m} type="button" onClick={() => setReason(m)} className="rounded-full border px-2.5 py-1 text-xs hover:border-primary">
              {m}
            </button>
          ))}
        </div>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo del rechazo" />
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 5 || pending}
            onClick={() => anuncio && onConfirm(anuncio.id, reason.trim())}
          >
            Rechazar anuncio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
