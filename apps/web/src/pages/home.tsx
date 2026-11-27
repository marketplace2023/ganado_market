import { useQuery } from "@tanstack/react-query"
import {
  ESTADOS_GANADEROS,
  ESTADOS_VENEZUELA,
  estadoName,
  type AnuncioCard,
  type Paginated,
  type Solicitud,
  type SubastaCard,
} from "@workspace/shared"
import { SolicitudCard } from "@workspace/ui/components/solicitud-card"
import { ContactoSolicitud } from "@/components/contacto-solicitud"
import { Spotlight } from "@/components/ui/spotlight"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { cn } from "cn"
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  FileCheck2,
  Gavel,
  MessageCircle,
  Search,
  Stethoscope,
  Truck,
} from "lucide-react"
import { lazy, Suspense, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { AnuncioGrid, AnuncioGridSkeleton } from "@/components/anuncio-card"
import { SubastaCardView } from "@/components/subasta-card"
import { GANADERO_URL, api, useEspecies } from "@/lib/api"

const BorderBeam = lazy(async () => {
  const { BorderBeam } = await import("@workspace/ui/components/border-beam")
  return { default: BorderBeam }
})

export function HomePage() {
  const navigate = useNavigate()
  const { data: especies } = useEspecies()
  const [q, setQ] = useState("")
  const [especie, setEspecie] = useState("")
  const [estado, setEstado] = useState("")

  const destacados = useQuery({
    queryKey: ["anuncios", "destacados"],
    queryFn: () => api.get<AnuncioCard[]>("/anuncios/destacados"),
  })
  const subastas = useQuery({
    queryKey: ["subastas", "vigentes"],
    queryFn: () => api.get<SubastaCard[]>("/subastas"),
  })
  const solicitudes = useQuery({
    queryKey: ["solicitudes", "home"],
    queryFn: () => api.get<Paginated<Solicitud>>("/solicitudes?limit=3"),
  })

  function buscar(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    if (especie) params.set("especie", especie)
    if (estado) params.set("estado", estado)
    navigate(`/ganado?${params}`)
  }

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#102e25] text-[#fffaee]">
        <Spotlight className="-top-1/2 -left-1/4 opacity-70" fill="#b9d49a" />
        <div className="relative mx-auto grid max-w-7xl gap-x-10 gap-y-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2 lg:items-start lg:py-16">
          <div className="lg:self-end">
            <h1 className="max-w-xl text-4xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl">
              Compra y vende ganado <span className="text-[#c1d99c]">en Venezuela.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#e1e8d9] sm:text-lg">
              Encuentra lotes y ejemplares, contacta al productor y consulta precios en dólares con referencia BCV.
            </p>
          </div>

          <div className="relative order-last aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-white/20 bg-[#183c30] lg:order-0 lg:row-span-3 lg:aspect-auto lg:h-full lg:min-h-96">
            <img
              src="/api/demo-images/hato-los-samanes.webp"
              alt="Ilustración de ganado Brahman en un hato de los llanos de Apure"
              fetchPriority="high"
              className="absolute inset-0 size-full object-cover"
            />
            <Suspense fallback={null}>
              <BorderBeam
                size={160}
                duration={5}
                colorFrom="#e9cf92"
                colorTo="#a7c380"
                transition={{ repeat: 0 }}
              />
            </Suspense>
          </div>

          <form
            onSubmit={buscar}
            className="grid gap-2 rounded-2xl border border-white/20 bg-card p-2 text-foreground shadow-sm sm:grid-cols-[1fr_1fr_auto]"
          >
            <div className="relative sm:col-span-3">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Raza, tipo de animal o municipio…"
                className="h-11 w-full rounded-lg bg-muted/35 pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Buscar"
              />
            </div>
            <NativeSelect className="w-full [&_select]:h-11" value={especie} onChange={(e) => setEspecie(e.target.value)} aria-label="Especie">
              <NativeSelectOption value="">Todas las especies</NativeSelectOption>
              {especies?.map((e) => (
                <NativeSelectOption key={e.slug} value={e.slug}>
                  {e.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect className="w-full [&_select]:h-11" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
              <NativeSelectOption value="">Toda Venezuela</NativeSelectOption>
              {ESTADOS_VENEZUELA.map((e) => (
                <NativeSelectOption key={e.slug} value={e.slug}>
                  {e.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button type="submit" size="lg" className="h-11 px-5">
              Buscar
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[#d0dfc8]">Estados ganaderos</span>
            {ESTADOS_GANADEROS.slice(0, 6).map((e) => (
              <Link
                key={e}
                to={`/ganado?estado=${e}`}
                className="rounded-full border border-white/25 px-3 py-1 transition-colors hover:border-[#c1d99c] hover:bg-white/10"
              >
                {estadoName(e)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Especies */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {especies?.map((e) => (
            <Link
              key={e.slug}
              to={`/ganado?especie=${e.slug}`}
              className="group rounded-xl border bg-card p-4 transition hover:border-primary/50 hover:shadow-sm"
            >
              <p className="font-semibold group-hover:text-primary">{e.name}</p>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {e.razas.slice(0, 3).map((r) => r.name).join(", ")}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Destacados */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <SectionTitle title="Ganado destacado" href="/ganado" cta="Ver todo el ganado" />
        {destacados.isLoading ? (
          <AnuncioGridSkeleton count={4} />
        ) : destacados.data?.length ? (
          <AnuncioGrid items={destacados.data} />
        ) : (
          <p className="text-sm text-muted-foreground">Aún no hay anuncios publicados.</p>
        )}
      </section>

      {/* Remates */}
      {subastas.data && subastas.data.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
          <SectionTitle title="Remates virtuales" href="/subastas" cta="Ver remates" icon={Gavel} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subastas.data.slice(0, 3).map((s) => (
              <SubastaCardView key={s.id} subasta={s} />
            ))}
          </div>
        </section>
      )}

      {/* Solicitudes de compra */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <SectionTitle title="Compradores buscando ganado" href="/solicitudes" cta="Ver solicitudes" icon={ClipboardList} />
        {solicitudes.data?.items.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {solicitudes.data.items.map((s) => (
              <SolicitudCard key={s.id} solicitud={s} action={<ContactoSolicitud solicitud={s} />} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-card p-6 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-muted-foreground">
              ¿No encuentras lo que buscas? Publica una solicitud con raza, peso y presupuesto, y deja que los ganaderos te
              contacten por WhatsApp.
            </p>
            <Link to="/solicitudes/nueva" className={buttonVariants()}>Publicar solicitud</Link>
          </div>
        )}
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="grid gap-6 rounded-2xl border bg-card p-6 sm:p-8 lg:grid-cols-3">
          {[
            {
              icon: BadgeCheck,
              title: "Fincas verificadas",
              text: "Revisamos RIF y hierro de cada finca. Busca la insignia azul antes de negociar.",
            },
            {
              icon: FileCheck2,
              title: "Sanidad y movilización",
              text: "Cada anuncio indica vacunación (aftosa, brucelosis) y si cuenta con guía de movilización.",
            },
            {
              icon: MessageCircle,
              title: "Trato directo por WhatsApp",
              text: "Sin intermediarios: escribe al ganadero desde el anuncio y acuerda pesaje, pago y entrega.",
            },
          ].map((f) => (
            <div key={f.title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{f.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA ganadero + servicios */}
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pt-6 sm:px-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl bg-primary p-8 text-primary-foreground">
          <h2 className="text-2xl font-semibold">¿Tienes ganado para vender?</h2>
          <p className="mt-2 max-w-lg text-primary-foreground/80">
            Registra tu finca, publica lotes o ejemplares con fotos y recibe consultas de compradores de
            todo el país. Publicar es gratis.
          </p>
          <a
            href={`${GANADERO_URL}/registro`}
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "mt-6")}
          >
            Publicar mi ganado <ArrowRight />
          </a>
        </div>
        <Link
          to="/servicios"
          className="flex flex-col justify-between rounded-2xl border bg-card p-8 transition hover:border-primary/50"
        >
          <div className="flex gap-2 text-primary">
            <Truck className="size-6" />
            <Stethoscope className="size-6" />
          </div>
          <div className="mt-6">
            <p className="text-lg font-semibold">Transporte y veterinarios</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Jaulas ganaderas, médicos veterinarios e inseminación por estado.
            </p>
          </div>
        </Link>
      </section>
    </>
  )
}

function SectionTitle({
  title,
  href,
  cta,
  icon: Icon,
}: {
  title: string
  href: string
  cta: string
  icon?: typeof Gavel
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        {Icon && <Icon className="size-6 text-primary" />}
        {title}
      </h2>
      <Link to={href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        {cta} <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
