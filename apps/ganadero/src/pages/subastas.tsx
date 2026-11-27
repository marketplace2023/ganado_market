import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  SUBASTA_STATUS_LABEL,
  formatDateTime,
  formatUsd,
  loteDto,
  subastaDto,
  type AnuncioOwned,
  type Finca,
  type Lote,
  type SubastaOwned,
} from "@workspace/shared"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { EmptyState, PageHeader } from "@workspace/ui/components/dashboard-shell"
import { FormField, StatusBadge } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { ExternalLink, Gavel, Plus, Send, Trash2, Trophy } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { WEB_URL, api, useFincas } from "@/lib/api"
import { useSchemaForm } from "@/lib/form"

type SubastaConLotes = SubastaOwned & { lotes: (Lote & { mejorPostor?: string | null })[] }

export function SubastasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["subastas"],
    queryFn: () => api.get<SubastaOwned[]>("/ganadero/subastas"),
  })
  return (
    <>
      <PageHeader
        title="Remates virtuales"
        description="Agrupa tus anuncios publicados en lotes y recibe pujas en línea. Cada remate se revisa antes de salir."
        actions={<Link to="/subastas/nueva" className={buttonVariants()}><Plus /> Nuevo remate</Link>}
      />
      {isLoading ? null : data?.length ? (
        <div className="space-y-3">
          {data.map((s) => (
            <Link key={s.id} to={`/subastas/${s.id}`} className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition hover:border-primary/50 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground">
                  {s.fincaName} · {s.lotesCount} lotes · {formatDateTime(s.startsAt)} → {formatDateTime(s.endsAt)}
                </p>
              </div>
              <StatusBadge status={s.status} label={SUBASTA_STATUS_LABEL[s.status]} />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Gavel}
          title="Aún no organizas remates"
          description="Ideal para vender varios lotes a la vez y obtener el mejor precio."
          action={<Link to="/subastas/nueva" className={buttonVariants()}>Crear remate</Link>}
        />
      )}
    </>
  )
}

/** datetime-local ⇄ ISO */
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function SubastaEditorPage() {
  const { id } = useParams()
  const isNew = !id
  const qc = useQueryClient()
  const fincas = useFincas()
  const subasta = useQuery({
    queryKey: ["subasta", id],
    queryFn: () => api.get<SubastaConLotes>(`/ganadero/subastas/${id}`),
    enabled: !isNew,
    refetchInterval: (q) => (q.state.data?.status === "en_vivo" ? 10000 : false),
  })
  const s = subasta.data
  const editable = isNew || s?.rawStatus === "borrador" || s?.rawStatus === "pendiente"

  const enviar = useMutation({
    mutationFn: () => api.post(`/ganadero/subastas/${id}/enviar`),
    onSuccess: () => {
      toast.success("Remate enviado a revisión")
      qc.invalidateQueries({ queryKey: ["subasta", id] })
      qc.invalidateQueries({ queryKey: ["subastas"] })
    },
    onError: (e) => toast.error(e.message),
  })

  if (!fincas.data || (!isNew && !s)) return <Skeleton className="h-96 rounded-xl" />

  return (
    <>
      <PageHeader
        title={isNew ? "Nuevo remate" : (s?.title ?? "Remate")}
        description={s ? <StatusBadge status={s.status} label={SUBASTA_STATUS_LABEL[s.status]} /> : "Define la finca, las fechas y luego agrega los lotes."}
        actions={
          s && (
            <>
              {(s.rawStatus === "programada" || s.rawStatus === "finalizada") && (
                <a href={`${WEB_URL}/subastas/${s.slug}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
                  Ver público <ExternalLink />
                </a>
              )}
              {s.rawStatus === "borrador" && (
                <Button onClick={() => enviar.mutate()} disabled={enviar.isPending}>
                  <Send /> Enviar a revisión
                </Button>
              )}
            </>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* key: el formulario toma los valores iniciales una sola vez (las pujas en vivo no lo reinician) */}
        <SubastaDatosForm key={id ?? "nueva"} id={id} subasta={s} fincas={fincas.data} editable={editable} />
        {!isNew && s && <Lotes subasta={s} editable={editable} />}
      </div>
    </>
  )
}

function SubastaDatosForm({
  id,
  subasta: s,
  fincas,
  editable,
}: {
  id?: string
  subasta?: SubastaConLotes
  fincas: Finca[]
  editable: boolean
}) {
  const isNew = !id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { errors, validate, onServerError, clear } = useSchemaForm(subastaDto)
  const [v, setV] = useState(() =>
    s
      ? { fincaId: String(s.fincaId), title: s.title, description: s.description, startsAt: toLocalInput(s.startsAt), endsAt: toLocalInput(s.endsAt) }
      : { fincaId: fincas.length === 1 ? String(fincas[0].id) : "", title: "", description: "", startsAt: "", endsAt: "" }
  )

  const save = useMutation({
    mutationFn: (dto: object) => (isNew ? api.post<{ id: number }>("/ganadero/subastas", dto) : api.put<{ id: number }>(`/ganadero/subastas/${id}`, dto)),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["subastas"] })
      qc.invalidateQueries({ queryKey: ["subasta", id] })
      toast.success(isNew ? "Remate creado. Ahora agrega los lotes." : "Cambios guardados")
      if (isNew) navigate(`/subastas/${row.id}`, { replace: true })
    },
    onError: onServerError,
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const dto = validate({
      ...v,
      startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : "",
      endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : "",
    })
    if (dto) save.mutate(dto)
  }
  const bind = (k: keyof typeof v) => ({
    value: v[k],
    disabled: !editable,
    onChange: (e: { target: { value: string } }) => {
      clear(k)
      setV((x) => ({ ...x, [k]: e.target.value }))
    },
  })

  return (
    <form onSubmit={submit} noValidate className="space-y-4 self-start rounded-xl border bg-card p-5">
      <FormField label="Finca organizadora" required error={errors.fincaId}>
        <NativeSelect className="w-full" {...bind("fincaId")}>
          <NativeSelectOption value="">Selecciona…</NativeSelectOption>
          {fincas.map((f) => <NativeSelectOption key={f.id} value={f.id}>{f.name}</NativeSelectOption>)}
        </NativeSelect>
      </FormField>
      <FormField label="Título" required error={errors.title}>
        <Input {...bind("title")} placeholder="Remate de levante — Diciembre" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Inicio" required error={errors.startsAt}>
          <Input type="datetime-local" {...bind("startsAt")} />
        </FormField>
        <FormField label="Cierre" required error={errors.endsAt}>
          <Input type="datetime-local" {...bind("endsAt")} />
        </FormField>
      </div>
      <FormField label="Condiciones" error={errors.description} hint="Pesaje, forma de pago, entrega, guías…">
        <Textarea rows={4} {...bind("description")} />
      </FormField>
      {editable && (
        <Button type="submit" className="w-full" disabled={save.isPending}>
          {isNew ? "Crear remate" : "Guardar"}
        </Button>
      )}
    </form>
  )
}

function Lotes({ subasta, editable }: { subasta: SubastaConLotes; editable: boolean }) {
  const qc = useQueryClient()
  const { errors, validate, onServerError } = useSchemaForm(loteDto)
  const [form, setForm] = useState({ anuncioId: "", precioBaseUsd: "", incrementoUsd: "50" })
  const anuncios = useQuery({
    queryKey: ["anuncios"],
    queryFn: () => api.get<AnuncioOwned[]>("/ganadero/anuncios"),
    enabled: editable,
  })
  const disponibles = anuncios.data?.filter(
    (a) => a.status === "publicado" && !a.reservado && !subasta.lotes.some((l) => l.anuncio.id === a.id)
  ) ?? []
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["subasta", String(subasta.id)] })
    qc.invalidateQueries({ queryKey: ["subastas"] })
  }

  const add = useMutation({
    mutationFn: (dto: object) => api.post(`/ganadero/subastas/${subasta.id}/lotes`, dto),
    onSuccess: () => {
      setForm({ anuncioId: "", precioBaseUsd: "", incrementoUsd: "50" })
      refresh()
    },
    onError: onServerError,
  })
  const remove = useMutation({
    mutationFn: (loteId: number) => api.del(`/ganadero/subastas/${subasta.id}/lotes/${loteId}`),
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="space-y-4">
      {editable && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const dto = validate(form)
            if (dto) add.mutate(dto)
          }}
          noValidate
          className="grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-[1fr_130px_120px_auto] sm:items-end"
        >
          <FormField label="Anuncio publicado" error={errors.anuncioId}>
            <NativeSelect className="w-full" value={form.anuncioId} onChange={(e) => setForm({ ...form, anuncioId: e.target.value })}>
              <NativeSelectOption value="">{disponibles.length ? "Selecciona…" : "No hay anuncios disponibles"}</NativeSelectOption>
              {disponibles.map((a) => <NativeSelectOption key={a.id} value={a.id}>{a.title}</NativeSelectOption>)}
            </NativeSelect>
          </FormField>
          <FormField label="Precio base $" error={errors.precioBaseUsd}>
            <Input type="number" min={0} value={form.precioBaseUsd} onChange={(e) => setForm({ ...form, precioBaseUsd: e.target.value })} />
          </FormField>
          <FormField label="Incremento $" error={errors.incrementoUsd}>
            <Input type="number" min={1} value={form.incrementoUsd} onChange={(e) => setForm({ ...form, incrementoUsd: e.target.value })} />
          </FormField>
          <Button type="submit" disabled={add.isPending}><Plus /> Agregar lote</Button>
        </form>
      )}
      {subasta.lotes.length ? (
        <div className="divide-y rounded-xl border bg-card">
          {subasta.lotes.map((l) => (
            <div key={l.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-primary">Lote {l.orden}</p>
                <p className="truncate font-medium">{l.anuncio.title}</p>
                <p className="text-sm text-muted-foreground">
                  Base {formatUsd(l.precioBaseUsd)} · +{formatUsd(l.incrementoUsd)} · {l.pujasCount} pujas
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums">{l.mejorPujaUsd !== null ? formatUsd(l.mejorPujaUsd) : "—"}</p>
                {l.mejorPostor && (
                  <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <Trophy className="size-3.5 text-amber-500" /> {l.mejorPostor}
                  </p>
                )}
              </div>
              {editable && (
                <Button variant="ghost" size="icon-sm" aria-label="Quitar lote" onClick={() => remove.mutate(l.id)}>
                  <Trash2 className="text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Gavel} title="Sin lotes" description="Agrega anuncios publicados como lotes del remate." />
      )}
    </div>
  )
}
