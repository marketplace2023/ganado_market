import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CATEGORIAS_ANIMAL,
  CATEGORIA_ANIMAL_LABEL,
  ESTADOS_VENEZUELA,
  MODALIDADES_PRECIO,
  MODALIDAD_PRECIO_LABEL,
  PROPOSITO_LABEL,
  SEXOS,
  SEXO_LABEL,
  TIPOS_ANUNCIO,
  TIPO_ANUNCIO_LABEL,
  anuncioDto,
  formatUsd,
  type AnuncioEditable,
  type Finca,
} from "@workspace/shared"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/dashboard-shell"
import { CheckboxField, FormField } from "@workspace/ui/components/form-field"
import { ImageUploader } from "@workspace/ui/components/image-uploader"
import { Input } from "@workspace/ui/components/input"
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@workspace/ui/components/native-select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "cn"
import { Fence } from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { api, useEspecies, useFincas } from "@/lib/api"
import { useSchemaForm } from "@/lib/form"

type Values = {
  fincaId: string
  especieId: string
  razaId: string
  title: string
  description: string
  tipo: string
  categoriaAnimal: string
  sexo: string
  cantidad: string
  edadMeses: string
  pesoPromedioKg: string
  precioUsd: string
  modalidadPrecio: string
  negociable: boolean
  estado: string
  municipio: string
  vacunaAftosa: boolean
  vacunaBrucelosis: boolean
  guiaMovilizacion: boolean
  desparasitado: boolean
  registroGenealogico: boolean
  videoUrl: string
  media: string[]
}

const EMPTY: Values = {
  fincaId: "",
  especieId: "",
  razaId: "",
  title: "",
  description: "",
  tipo: "lote",
  categoriaAnimal: "",
  sexo: "macho",
  cantidad: "1",
  edadMeses: "",
  pesoPromedioKg: "",
  precioUsd: "",
  modalidadPrecio: "por_cabeza",
  negociable: true,
  estado: "",
  municipio: "",
  vacunaAftosa: false,
  vacunaBrucelosis: false,
  guiaMovilizacion: false,
  desparasitado: false,
  registroGenealogico: false,
  videoUrl: "",
  media: [],
}

const str = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v))

/** Carga fincas y (si se edita) el anuncio; luego monta el formulario con esos valores iniciales. */
export function AnuncioEditorPage() {
  const { id } = useParams()
  const fincas = useFincas()
  const existing = useQuery({
    queryKey: ["anuncio", id],
    queryFn: () => api.get<AnuncioEditable>(`/ganadero/anuncios/${id}`),
    enabled: Boolean(id),
  })

  if (!fincas.data || (id && !existing.data)) return <Skeleton className="h-96 rounded-xl" />
  if (fincas.data.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Fence className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Primero registra tu finca</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cada anuncio se publica a nombre de una finca o hato.</p>
        <Link to="/fincas/nueva" className={cn(buttonVariants(), "mt-5")}>Registrar finca</Link>
      </div>
    )
  }
  return <AnuncioForm key={id ?? "nuevo"} id={id} existing={existing.data} fincas={fincas.data} />
}

function initialValues(existing: AnuncioEditable | undefined, fincas: Finca[]): Values {
  if (existing) {
    return {
      ...EMPTY,
      ...Object.fromEntries(
        Object.entries(existing).map(([k, val]) => [k, typeof val === "boolean" || Array.isArray(val) ? val : str(val as string)])
      ),
    } as Values
  }
  // Con una sola finca, se preselecciona y se copia su ubicación.
  if (fincas.length === 1) {
    const f = fincas[0]
    return { ...EMPTY, fincaId: String(f.id), estado: f.estado, municipio: f.municipio }
  }
  return EMPTY
}

function AnuncioForm({ id, existing, fincas }: { id?: string; existing?: AnuncioEditable; fincas: Finca[] }) {
  const isNew = !id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const especies = useEspecies()
  const [v, setV] = useState<Values>(() => initialValues(existing, fincas))
  const { errors, validate, onServerError, clear } = useSchemaForm(anuncioDto)

  const especie = useMemo(
    () => especies.data?.find((e) => String(e.id) === v.especieId),
    [especies.data, v.especieId]
  )
  const razasPorProposito = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof especie>["razas"]>()
    for (const r of especie?.razas ?? []) {
      const key = r.proposito ? PROPOSITO_LABEL[r.proposito] : "Otras"
      groups.set(key, [...(groups.get(key) ?? []), r])
    }
    return [...groups.entries()]
  }, [especie])

  const save = useMutation({
    mutationFn: (body: object) =>
      isNew ? api.post<{ id: number }>("/ganadero/anuncios", body) : api.put(`/ganadero/anuncios/${id}`, body),
    onSuccess: (_d, body) => {
      qc.invalidateQueries({ queryKey: ["anuncios"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      toast.success((body as { submit: boolean }).submit ? "Enviado a revisión. Te avisaremos al publicarse." : "Borrador guardado")
      navigate("/anuncios")
    },
    onError: onServerError,
  })

  const set = <K extends keyof Values>(k: K, value: Values[K]) => {
    clear(k)
    setV((s) => ({ ...s, [k]: value }))
  }
  const bind = (k: keyof Values) => ({
    value: v[k] as string,
    onChange: (e: { target: { value: string } }) => set(k, e.target.value as never),
  })

  function submit(submitForReview: boolean) {
    return (e?: FormEvent) => {
      e?.preventDefault()
      const raw = {
        ...v,
        razaId: v.razaId || null,
        categoriaAnimal: v.categoriaAnimal || null,
        edadMeses: v.edadMeses || null,
        pesoPromedioKg: v.pesoPromedioKg || null,
      }
      const dto = validate(raw)
      if (dto) save.mutate({ ...dto, submit: submitForReview })
    }
  }

  const status = existing?.status
  const precioHint =
    v.precioUsd && v.modalidadPrecio === "por_kg" && v.pesoPromedioKg && v.cantidad
      ? `≈ ${formatUsd(Number(v.precioUsd) * Number(v.pesoPromedioKg) * Number(v.cantidad))} el lote completo`
      : v.precioUsd && v.modalidadPrecio === "por_cabeza" && Number(v.cantidad) > 1
        ? `≈ ${formatUsd(Number(v.precioUsd) * Number(v.cantidad))} el lote completo`
        : undefined

  return (
    <>
      <PageHeader
        title={isNew ? "Publicar ganado" : "Editar anuncio"}
        description={
          status === "publicado"
            ? "Al guardar cambios, el anuncio vuelve a revisión antes de publicarse de nuevo."
            : "Completa la ficha: los compradores filtran por especie, raza, estado y sanidad."
        }
      />
      <form onSubmit={submit(true)} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Section title="¿Qué vendes?">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Finca" required error={errors.fincaId}>
                <NativeSelect
                  className="w-full"
                  value={v.fincaId}
                  onChange={(e) => {
                    clear("fincaId")
                    const f = fincas.find((x) => String(x.id) === e.target.value)
                    setV((s) => ({ ...s, fincaId: e.target.value, estado: s.estado || f?.estado || "", municipio: s.municipio || f?.municipio || "" }))
                  }}
                >
                  <NativeSelectOption value="">Selecciona…</NativeSelectOption>
                  {fincas.map((f) => <NativeSelectOption key={f.id} value={f.id}>{f.name}</NativeSelectOption>)}
                </NativeSelect>
              </FormField>
              <FormField label="Tipo de anuncio" required error={errors.tipo}>
                <NativeSelect className="w-full" {...bind("tipo")}>
                  {TIPOS_ANUNCIO.map((t) => <NativeSelectOption key={t} value={t}>{TIPO_ANUNCIO_LABEL[t]}</NativeSelectOption>)}
                </NativeSelect>
              </FormField>
              <FormField label="Especie" required error={errors.especieId}>
                <NativeSelect className="w-full" value={v.especieId} onChange={(e) => {
                  clear("especieId")
                  setV((s) => ({ ...s, especieId: e.target.value, razaId: "" }))
                }}>
                  <NativeSelectOption value="">Selecciona…</NativeSelectOption>
                  {especies.data?.map((e) => <NativeSelectOption key={e.id} value={e.id}>{e.name}</NativeSelectOption>)}
                </NativeSelect>
              </FormField>
              <FormField label="Raza" error={errors.razaId}>
                <NativeSelect className="w-full" {...bind("razaId")} disabled={!especie}>
                  <NativeSelectOption value="">{especie ? "Selecciona…" : "Elige la especie"}</NativeSelectOption>
                  {razasPorProposito.map(([grupo, razas]) => (
                    <NativeSelectOptGroup key={grupo} label={grupo}>
                      {razas.map((r) => <NativeSelectOption key={r.id} value={r.id}>{r.name}</NativeSelectOption>)}
                    </NativeSelectOptGroup>
                  ))}
                </NativeSelect>
              </FormField>
            </div>
            <FormField label="Título" required error={errors.title} hint="Ej. “Lote de 40 mautes Brahman comerciales”">
              <Input {...bind("title")} maxLength={120} />
            </FormField>
          </Section>

          <Section title="Ficha de los animales">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Clase" error={errors.categoriaAnimal}>
                <NativeSelect className="w-full" {...bind("categoriaAnimal")}>
                  <NativeSelectOption value="">—</NativeSelectOption>
                  {CATEGORIAS_ANIMAL.map((c) => <NativeSelectOption key={c} value={c}>{CATEGORIA_ANIMAL_LABEL[c]}</NativeSelectOption>)}
                </NativeSelect>
              </FormField>
              <FormField label="Sexo" required error={errors.sexo}>
                <NativeSelect className="w-full" {...bind("sexo")}>
                  {SEXOS.map((s) => <NativeSelectOption key={s} value={s}>{SEXO_LABEL[s]}</NativeSelectOption>)}
                </NativeSelect>
              </FormField>
              <FormField label="Cantidad (cabezas)" required error={errors.cantidad}>
                <Input type="number" min={1} {...bind("cantidad")} />
              </FormField>
              <FormField label="Edad promedio (meses)" error={errors.edadMeses}>
                <Input type="number" min={0} {...bind("edadMeses")} />
              </FormField>
              <FormField label="Peso promedio (kg)" error={errors.pesoPromedioKg}>
                <Input type="number" min={0} step="any" {...bind("pesoPromedioKg")} />
              </FormField>
            </div>
            <FormField label="Descripción" error={errors.description}>
              <Textarea rows={5} {...bind("description")} placeholder="Manejo, alimentación, condición corporal, disponibilidad para pesaje y entrega…" />
            </FormField>
          </Section>

          <Section title="Sanidad y documentos">
            <div className="grid gap-3 sm:grid-cols-2">
              <CheckboxField label="Vacuna contra fiebre aftosa" checked={v.vacunaAftosa} onChange={(c) => set("vacunaAftosa", c)} />
              <CheckboxField label="Vacuna contra brucelosis" checked={v.vacunaBrucelosis} onChange={(c) => set("vacunaBrucelosis", c)} />
              <CheckboxField
                label="Guía de movilización"
                description="Certificado zoosanitario / guía INSAI para trasladar los animales"
                checked={v.guiaMovilizacion}
                onChange={(c) => set("guiaMovilizacion", c)}
              />
              <CheckboxField label="Desparasitado" description="Tratamiento antiparasitario reciente" checked={v.desparasitado} onChange={(c) => set("desparasitado", c)} />
              <CheckboxField label="Registro genealógico" description="Animales registrados en asociación de raza" checked={v.registroGenealogico} onChange={(c) => set("registroGenealogico", c)} />
            </div>
          </Section>

          <Section title="Fotos y video">
            <ImageUploader
              value={v.media}
              onChange={(urls) => set("media", urls)}
              upload={async (file) => (await api.upload(file)).url}
              onError={toast.error}
            />
            <p className="text-xs text-muted-foreground">Hasta 10 fotos (JPG, PNG o WebP, máx. 5 MB). La primera es la portada.</p>
            <FormField label="Enlace a video (YouTube, Drive…)" error={errors.videoUrl}>
              <Input type="url" {...bind("videoUrl")} placeholder="https://" />
            </FormField>
          </Section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Section title="Precio">
            <FormField label="Precio (USD)" required error={errors.precioUsd} hint={precioHint}>
              <Input type="number" min={0} step="any" {...bind("precioUsd")} />
            </FormField>
            <FormField label="Modalidad" required error={errors.modalidadPrecio}>
              <NativeSelect className="w-full" {...bind("modalidadPrecio")}>
                {MODALIDADES_PRECIO.map((m) => <NativeSelectOption key={m} value={m}>{MODALIDAD_PRECIO_LABEL[m]}</NativeSelectOption>)}
              </NativeSelect>
            </FormField>
            <CheckboxField label="Precio negociable" checked={v.negociable} onChange={(c) => set("negociable", c)} />
          </Section>
          <Section title="Ubicación de los animales">
            <FormField label="Estado" required error={errors.estado}>
              <NativeSelect className="w-full" {...bind("estado")}>
                <NativeSelectOption value="">Selecciona…</NativeSelectOption>
                {ESTADOS_VENEZUELA.map((e) => <NativeSelectOption key={e.slug} value={e.slug}>{e.name}</NativeSelectOption>)}
              </NativeSelect>
            </FormField>
            <FormField label="Municipio" required error={errors.municipio}>
              <Input {...bind("municipio")} />
            </FormField>
          </Section>
          <Button type="submit" size="lg" className="h-10 w-full" disabled={save.isPending}>
            {save.isPending ? "Guardando…" : "Enviar a revisión"}
          </Button>
          {(isNew || status === "borrador") && (
            <Button type="button" variant="outline" size="lg" className="h-10 w-full" disabled={save.isPending} onClick={submit(false)}>
              Guardar borrador
            </Button>
          )}
        </div>
      </form>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  )
}
