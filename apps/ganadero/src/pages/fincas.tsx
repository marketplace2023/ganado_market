import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ESTADOS_VENEZUELA,
  FINCA_VERIFICACION_LABEL,
  estadoName,
  fincaDto,
  formatNumber,
  type Finca,
} from "@workspace/shared"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { EmptyState, PageHeader } from "@workspace/ui/components/dashboard-shell"
import { FormField, StatusBadge } from "@workspace/ui/components/form-field"
import { ImageUploader } from "@workspace/ui/components/image-uploader"
import { Input } from "@workspace/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { ExternalLink, Fence, MapPin, Pencil, Plus } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { WEB_URL, api, useFincas } from "@/lib/api"
import { useSchemaForm } from "@/lib/form"

export function FincasPage() {
  const { data, isLoading } = useFincas()
  return (
    <>
      <PageHeader
        title="Mis fincas"
        description="Tus anuncios y remates se publican a nombre de una finca."
        actions={
          <Link to="/fincas/nueva" className={buttonVariants()}>
            <Plus /> Nueva finca
          </Link>
        }
      />
      {isLoading ? null : data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((f) => (
            <div key={f.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center overflow-hidden rounded-lg bg-secondary text-lg font-semibold">
                    {f.logoUrl ? <img src={f.logoUrl} alt="" className="size-full object-cover" /> : f.name[0]}
                  </span>
                  <div>
                    <p className="font-semibold">{f.name}</p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" /> {f.municipio}, {estadoName(f.estado)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={f.verificacion} label={FINCA_VERIFICACION_LABEL[f.verificacion]} />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span>{f.anunciosCount ?? 0} anuncios publicados</span>
                {f.hectareas && <span>{formatNumber(f.hectareas)} ha</span>}
                {f.hierro && <span>Hierro {f.hierro}</span>}
              </div>
              {f.verificacion === "pendiente" && (
                <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Un administrador revisará el RIF y el hierro para verificar la finca. Mientras tanto
                  puedes publicar anuncios normalmente.
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Link to={`/fincas/${f.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Pencil /> Editar
                </Link>
                <a
                  href={`${WEB_URL}/fincas/${f.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Ver perfil público <ExternalLink />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Fence}
          title="Aún no registras fincas"
          description="Registra tu finca o hato para empezar a publicar."
          action={<Link to="/fincas/nueva" className={buttonVariants()}>Registrar finca</Link>}
        />
      )}
    </>
  )
}

const EMPTY = {
  name: "",
  estado: "",
  municipio: "",
  direccion: "",
  hectareas: "",
  descripcion: "",
  whatsapp: "",
  rif: "",
  hierro: "",
  logoUrl: "",
  coverUrl: "",
}

function toValues(f?: Finca): typeof EMPTY {
  if (!f) return EMPTY
  return {
    name: f.name,
    estado: f.estado,
    municipio: f.municipio,
    direccion: f.direccion ?? "",
    hectareas: f.hectareas ? String(f.hectareas) : "",
    descripcion: f.descripcion ?? "",
    whatsapp: f.whatsapp.startsWith("58") ? `0${f.whatsapp.slice(2)}` : f.whatsapp,
    rif: f.rif ?? "",
    hierro: f.hierro ?? "",
    logoUrl: f.logoUrl ?? "",
    coverUrl: f.coverUrl ?? "",
  }
}

/** Carga la finca (si se edita) y monta el formulario con esos valores iniciales. */
export function FincaFormPage() {
  const { id } = useParams()
  const existing = useQuery({
    queryKey: ["finca", id],
    queryFn: () => api.get<Finca>(`/ganadero/fincas/${id}`),
    enabled: Boolean(id),
  })
  if (id && !existing.data) return <Skeleton className="h-96 rounded-xl" />
  return <FincaForm key={id ?? "nueva"} id={id} existing={existing.data} />
}

function FincaForm({ id, existing }: { id?: string; existing?: Finca }) {
  const isNew = !id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [values, setValues] = useState(() => toValues(existing))
  const { errors, validate, onServerError, clear } = useSchemaForm(fincaDto)

  const save = useMutation({
    mutationFn: (dto: unknown) =>
      isNew ? api.post<Finca>("/ganadero/fincas", dto) : api.put<Finca>(`/ganadero/fincas/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fincas"] })
      toast.success(isNew ? "Finca registrada" : "Cambios guardados")
      navigate("/fincas")
    },
    onError: onServerError,
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const clean = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" ? undefined : v]))
    const dto = validate(clean)
    if (dto) save.mutate(dto)
  }

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => {
    clear(k)
    setValues((v) => ({ ...v, [k]: e.target.value }))
  }

  return (
    <>
      <PageHeader
        title={isNew ? "Registrar finca" : "Editar finca"}
        description="Los datos de contacto se muestran a los compradores en tus anuncios."
      />
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5 rounded-xl border bg-card p-5">
          <FormField label="Nombre de la finca o hato" required error={errors.name}>
            <Input value={values.name} onChange={set("name")} placeholder="Hato La Esperanza" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Estado" required error={errors.estado}>
              <NativeSelect className="w-full" value={values.estado} onChange={set("estado")}>
                <NativeSelectOption value="">Selecciona…</NativeSelectOption>
                {ESTADOS_VENEZUELA.map((e) => (
                  <NativeSelectOption key={e.slug} value={e.slug}>{e.name}</NativeSelectOption>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Municipio" required error={errors.municipio}>
              <Input value={values.municipio} onChange={set("municipio")} placeholder="Pedraza" />
            </FormField>
          </div>
          <FormField label="Dirección / sector" error={errors.direccion} hint="No se muestra públicamente">
            <Input value={values.direccion} onChange={set("direccion")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="WhatsApp de contacto" required error={errors.whatsapp}>
              <Input inputMode="tel" value={values.whatsapp} onChange={set("whatsapp")} placeholder="0414-1234567" />
            </FormField>
            <FormField label="Hectáreas" error={errors.hectareas}>
              <Input type="number" min={0} value={values.hectareas} onChange={set("hectareas")} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="RIF" error={errors.rif} hint="Necesario para verificar la finca">
              <Input value={values.rif} onChange={set("rif")} placeholder="J-12345678-9" />
            </FormField>
            <FormField label="Hierro registrado" error={errors.hierro} hint="Código o descripción de la marca">
              <Input value={values.hierro} onChange={set("hierro")} />
            </FormField>
          </div>
          <FormField label="Descripción" error={errors.descripcion}>
            <Textarea
              rows={4}
              value={values.descripcion}
              onChange={set("descripcion")}
              placeholder="Tipo de explotación, razas que trabajas, manejo sanitario…"
            />
          </FormField>
        </div>
        <div className="space-y-5">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <FormField label="Logo">
              <ImageUploader
                max={1}
                value={values.logoUrl ? [values.logoUrl] : []}
                onChange={(urls) => setValues((v) => ({ ...v, logoUrl: urls[0] ?? "" }))}
                upload={async (file) => (await api.upload(file)).url}
                onError={toast.error}
              />
            </FormField>
            <FormField label="Foto de portada">
              <ImageUploader
                max={1}
                value={values.coverUrl ? [values.coverUrl] : []}
                onChange={(urls) => setValues((v) => ({ ...v, coverUrl: urls[0] ?? "" }))}
                upload={async (file) => (await api.upload(file)).url}
                onError={toast.error}
              />
            </FormField>
          </div>
          <Button type="submit" size="lg" className="h-10 w-full" disabled={save.isPending}>
            {save.isPending ? "Guardando…" : isNew ? "Registrar finca" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </>
  )
}
