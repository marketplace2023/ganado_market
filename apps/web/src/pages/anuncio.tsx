import { useMutation, useQuery } from "@tanstack/react-query"
import {
  ApiError,
  CATEGORIA_ANIMAL_LABEL,
  SEXO_LABEL,
  TIPO_ANUNCIO_LABEL,
  consultaDto,
  estadoName,
  formatNumber,
  issuesToFieldErrors,
  whatsappUrl,
  type AnuncioDetail,
} from "@workspace/shared"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "cn"
import {
  BadgeCheck,
  ChevronRight,
  CircleCheck,
  CircleX,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Video,
} from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { AnimalPlaceholder } from "@/components/animal-placeholder"
import { AnuncioGrid } from "@/components/anuncio-card"
import { MapaUbicacion } from "@/components/resultados-mapa"
import { puntoAnuncio } from "@/lib/ubicaciones"
import { NotFoundPage } from "@/pages/not-found"
import { Precio } from "@/components/precio"
import { DenunciarAnuncio } from "@/components/denunciar"
import { api, useAuth } from "@/lib/api"
import { useFavoritos } from "@/lib/favoritos"

export function AnuncioPage() {
  const { slug } = useParams()
  const { data: a, isLoading, error } = useQuery({
    queryKey: ["anuncio", slug],
    queryFn: () => api.get<AnuncioDetail>(`/anuncios/${slug}`),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  })
  const [foto, setFoto] = useState(0)
  const { isFavorito, toggle } = useFavoritos()

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />
  if (isLoading || !a) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px]">
        <Skeleton className="aspect-[4/3] rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  const vendido = a.status === "vendido"
  const disponible = !vendido && !a.reservado
  const wa = whatsappUrl(
    a.finca.whatsapp,
    `Hola, vi su anuncio "${a.title}" en GanadoMarket y me interesa. ¿Sigue disponible?`
  )
  const ficha: [string, string | null][] = [
    ["Especie", a.especieName],
    ["Raza", a.razaName],
    ["Tipo", TIPO_ANUNCIO_LABEL[a.tipo]],
    ["Clase", a.categoriaAnimal ? CATEGORIA_ANIMAL_LABEL[a.categoriaAnimal] : null],
    ["Sexo", SEXO_LABEL[a.sexo]],
    ["Cantidad", `${formatNumber(a.cantidad)} ${a.cantidad === 1 ? "animal" : "animales"}`],
    ["Edad", a.edadMeses ? `${a.edadMeses} meses` : null],
    ["Peso promedio", a.pesoPromedioKg ? `${formatNumber(a.pesoPromedioKg)} kg` : null],
    ["Ubicación", `${a.municipio}, ${estadoName(a.estado)}`],
  ]
  const sanidad: [string, boolean][] = [
    ["Vacuna contra fiebre aftosa", a.vacunaAftosa],
    ["Vacuna contra brucelosis", a.vacunaBrucelosis],
    ["Desparasitado", a.desparasitado],
    ["Guía de movilización (INSAI)", a.guiaMovilizacion],
    ["Registro genealógico", a.registroGenealogico],
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/ganado" className="hover:text-foreground">Ganado</Link>
        <ChevronRight className="size-3.5" />
        {a.especieSlug && (
          <>
            <Link to={`/ganado?especie=${a.especieSlug}`} className="hover:text-foreground">{a.especieName}</Link>
            <ChevronRight className="size-3.5" />
          </>
        )}
        <Link to={`/ganado?estado=${a.estado}`} className="hover:text-foreground">{estadoName(a.estado)}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          {/* Galería */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-muted">
            {a.media.length ? (
              <img src={a.media[foto]?.url} alt={a.title} className="size-full object-cover" />
            ) : (
              <AnimalPlaceholder especie={a.especieSlug} />
            )}
            {!disponible && (
              <span className={cn(
                "absolute top-3 left-3 rounded-md px-3 py-1 text-sm font-semibold",
                vendido ? "bg-sky-600 text-white" : "bg-amber-100 text-amber-900"
              )}>
                {vendido ? "Vendido" : "Reservado"}
              </span>
            )}
          </div>
          {a.media[foto]?.url.startsWith("/api/demo-images/") && (
            <p className="mt-2 text-xs text-muted-foreground">Imagen ilustrativa de demostración</p>
          )}
          {a.media.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {a.media.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setFoto(i)}
                  className={cn(
                    "size-20 shrink-0 overflow-hidden rounded-lg border-2",
                    i === foto ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <img src={m.url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <section>
              <h2 className="mb-3 text-lg font-semibold">Ficha del animal</h2>
              <dl className="divide-y rounded-xl border bg-card">
                {ficha
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
              </dl>
            </section>
            <section>
              <h2 className="mb-3 text-lg font-semibold">Sanidad y documentos</h2>
              <ul className="space-y-2 rounded-xl border bg-card p-4">
                {sanidad.map(([k, ok]) => (
                  <li key={k} className="flex items-center gap-2 text-sm">
                    {ok ? (
                      <CircleCheck className="size-4 text-primary" />
                    ) : (
                      <CircleX className="size-4 text-muted-foreground/50" />
                    )}
                    <span className={ok ? "" : "text-muted-foreground"}>{k}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Información declarada por el vendedor. Solicita los certificados antes de cerrar el negocio.
              </p>
            </section>
          </div>

          {a.description && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Descripción</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{a.description}</p>
            </section>
          )}
          {a.videoUrl && (
            <a
              href={a.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Video className="size-4" /> Ver video del ganado
            </a>
          )}
        </div>

        {/* Columna lateral */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-t-4 border-t-primary bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight">{a.title}</h1>
              <button
                onClick={() => toggle(a.id)}
                aria-label="Favorito"
                className="rounded-full border p-2 hover:bg-muted"
              >
                <Heart className={cn("size-4", isFavorito(a.id) && "fill-red-500 text-red-500")} />
              </button>
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {a.municipio}, {estadoName(a.estado)}
            </p>
            <div className="mt-4">
              <Precio usd={a.precioUsd} modalidad={a.modalidadPrecio} size="lg" />
              {a.negociable && <p className="mt-1 text-xs font-medium text-primary">Precio negociable</p>}
            </div>
            {disponible && wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                onClick={() => api.post(`/anuncios/${a.id}/whatsapp`).catch(() => undefined)}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-5 h-11 w-full bg-[#25D366] text-white hover:bg-[#1fb857]"
                )}
              >
                <MessageCircle /> Contactar por WhatsApp
              </a>
            )}
            {a.reservado && (
              <Link to="/ganado" className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full")}>
                Ver ganado disponible
              </Link>
            )}
            <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="size-3.5" /> {formatNumber(a.viewCount)} visitas
            </p>
          </div>

          <Link
            to={`/fincas/${a.finca.slug}`}
            className="flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/50"
          >
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-lg font-semibold text-secondary-foreground">
              {a.finca.logoUrl ? <img src={a.finca.logoUrl} alt="" className="size-full object-cover" /> : a.finca.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate font-medium">
                {a.finca.name}
                {a.finca.verificada && <BadgeCheck className="size-4 shrink-0 text-sky-600" />}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {a.finca.verificada ? "Finca verificada" : "Finca en verificación"} · {estadoName(a.finca.estado)}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>

          {disponible && <ConsultaForm anuncioId={a.id} />}
          <MapaUbicacion punto={puntoAnuncio(a)} />
          <CompraSegura anuncioId={a.id} />
        </aside>
      </div>

      {a.related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 border-b pb-3 font-heading text-3xl font-semibold tracking-tight">También te puede interesar</h2>
          <AnuncioGrid items={a.related} />
        </section>
      )}
    </div>
  )
}

/** Consejos para evitar estafas (referencia: tuganadovenezuela.com). */
function CompraSegura({ anuncioId }: { anuncioId: number }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
        <ShieldCheck className="size-4" /> Compra con seguridad
      </p>
      <ul className="mt-2 space-y-1.5 text-amber-900/80 dark:text-amber-100/80">
        <li>• Visita la finca y ve los animales antes de cerrar el trato.</li>
        <li>• Pide la guía de movilización y los certificados sanitarios.</li>
        <li>• Acuerda el pesaje en romana a la vista de ambas partes.</li>
        <li>• No hagas pagos por adelantado sin verificar el animal.</li>
      </ul>
      <DenunciarAnuncio anuncioId={anuncioId} className="mt-3 text-amber-900 dark:text-amber-200" />
    </div>
  )
}

function ConsultaForm({ anuncioId }: { anuncioId: number }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ? `0${user.phone.slice(2)}` : "",
    email: user?.email ?? "",
    message: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)

  const send = useMutation({
    mutationFn: (dto: typeof form) => api.post(`/anuncios/${anuncioId}/consultas`, dto),
    onSuccess: () => {
      setSent(true)
      toast.success("Consulta enviada al ganadero")
    },
    onError: (err) => {
      if (err instanceof ApiError) setErrors(err.fieldErrors())
      toast.error(err.message)
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = consultaDto.safeParse(form)
    if (!parsed.success) return setErrors(issuesToFieldErrors(parsed.error.issues))
    setErrors({})
    send.mutate(form)
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm">
        <p className="font-medium">¡Consulta enviada!</p>
        <p className="mt-1 text-muted-foreground">El ganadero te contactará al teléfono que indicaste.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-5" noValidate>
      <p className="font-medium">Enviar consulta</p>
      <FormField label="Nombre" error={errors.name}>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </FormField>
      <FormField label="Teléfono (WhatsApp)" error={errors.phone}>
        <Input
          inputMode="tel"
          placeholder="0414-1234567"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </FormField>
      <FormField label="Mensaje" error={errors.message}>
        <Textarea
          rows={3}
          placeholder="¿Cuál es el peso exacto? ¿Aceptan visita para ver el lote?"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </FormField>
      <Button type="submit" variant="outline" className="w-full" disabled={send.isPending}>
        {send.isPending ? "Enviando…" : "Enviar consulta"}
      </Button>
    </form>
  )
}
