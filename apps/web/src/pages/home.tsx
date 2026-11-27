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
import { BackgroundGradient } from "@workspace/ui/components/background-gradient"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { GridPattern } from "@workspace/ui/components/grid-pattern"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { cn } from "cn"
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  FileCheck2,
  Gavel,
  MapPin,
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

const portada = new URL("../../../api/assets/demo-images/hato-los-samanes.webp", import.meta.url).href

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
      <section className="relative isolate overflow-hidden border-b bg-[#f4f3e6]">
        <GridPattern size={34} className="text-[#315d43]/12 mask-[radial-gradient(ellipse_at_0_0,#000,transparent_65%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pt-8 pb-6 sm:px-6 sm:pt-12 lg:pt-13">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:items-center lg:gap-11">
            <div className="py-2 lg:pb-10">
              <h1 className="max-w-[13ch] font-heading text-[clamp(2.7rem,6.2vw,5.65rem)] leading-[.98] font-semibold tracking-[-.055em] text-[#142d24]">
                Compra y vende ganado <em className="font-medium text-[#315d43]">en Venezuela.</em>
              </h1>
              <p className="mt-4 max-w-[43ch] text-base leading-relaxed text-[#47554a] sm:mt-6 sm:text-lg">
                Encuentra lotes y ejemplares, compara precios en dólares y contacta directamente al productor.
              </p>
              <Link to="/fincas?vista=mapa" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#20533a] hover:underline sm:mt-5">
                <MapPin className="size-4" /> Explorar fincas en el mapa <ArrowRight className="size-4" />
              </Link>
            </div>

            <BackgroundGradient containerClassName="lg:min-w-0" className="relative isolate aspect-[16/10] overflow-hidden bg-[#213d30] lg:aspect-[1.44]">
              <img
                src={portada}
                alt="Ilustración de ganado Brahman en los llanos de Apure"
                fetchPriority="high"
                className="absolute inset-0 size-full object-cover object-center"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-[#13281d]/70 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-4 py-4 text-xs font-medium text-white sm:px-6 sm:text-sm lg:pb-14">
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" /> Llanos de Apure</span>
                <span>Ilustración ganadera</span>
              </div>
              <Suspense fallback={null}>
                <BorderBeam size={150} duration={5} colorFrom="#e9cf92" colorTo="#a7c380" transition={{ repeat: 0 }} />
              </Suspense>
            </BackgroundGradient>
          </div>

          <form
            onSubmit={buscar}
            role="search"
            aria-label="Buscar ganado en el catálogo"
            className="relative z-10 mt-4 grid items-end gap-3 rounded-2xl border bg-card p-3.5 shadow-[0_16px_40px_-25px_#19372e70] sm:grid-cols-2 sm:p-4 lg:-mt-8 lg:grid-cols-[1.25fr_1fr_1fr_auto] lg:gap-4"
          >
            <label className="block min-w-0 sm:col-span-2 lg:col-span-1">
              <span className="mb-1.5 block text-xs font-semibold text-foreground">¿Qué ganado buscas?</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Raza, lote o municipio"
                className="h-11 w-full rounded-lg border bg-muted/30 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <div className="min-w-0">
              <label htmlFor="inicio-especie" className="mb-1.5 block text-xs font-semibold">Especie</label>
              <NativeSelect id="inicio-especie" className="w-full [&_select]:h-11" value={especie} onChange={(e) => setEspecie(e.target.value)}>
                <NativeSelectOption value="">Todas las especies</NativeSelectOption>
                {especies?.map((e) => <NativeSelectOption key={e.slug} value={e.slug}>{e.name}</NativeSelectOption>)}
              </NativeSelect>
            </div>
            <div className="min-w-0">
              <label htmlFor="inicio-estado" className="mb-1.5 block text-xs font-semibold">Estado</label>
              <NativeSelect id="inicio-estado" className="w-full [&_select]:h-11" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <NativeSelectOption value="">Toda Venezuela</NativeSelectOption>
                {ESTADOS_VENEZUELA.map((e) => <NativeSelectOption key={e.slug} value={e.slug}>{e.name}</NativeSelectOption>)}
              </NativeSelect>
            </div>
            <Button type="submit" size="lg" className="h-11 px-5 sm:col-span-2 lg:col-span-1">
              <Search /> Buscar ganado
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-xs font-semibold text-[#47554a]">Estados ganaderos</span>
            {ESTADOS_GANADEROS.slice(0, 6).map((e) => (
              <Link
                key={e}
                to={`/ganado?estado=${e}`}
                className="rounded-lg border border-[#daddca] bg-white/60 px-3 py-1.5 text-xs font-medium text-[#31533e] transition-colors hover:border-[#96aa8c] hover:bg-white"
              >
                {estadoName(e)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {Boolean(especies?.length) && (
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <SectionTitle title="Explora por especie" href="/ganado" cta="Ir al catálogo" />
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-card sm:grid-cols-3 lg:grid-cols-6">
          {especies?.map((e) => (
            <Link
              key={e.slug}
              to={`/ganado?especie=${e.slug}`}
              className="group border-r border-b p-4 transition-colors hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <p className="flex items-start justify-between gap-1 font-semibold group-hover:text-primary">{e.name} <ArrowRight className="size-4 shrink-0 text-primary/70" /></p>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {e.razas.slice(0, 3).map((r) => r.name).join(", ")}
              </p>
            </Link>
          ))}
        </div>
      </section>
      )}

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
        <div className="grid gap-6 border-y border-[#cdd6bf] bg-[#eff2e6] p-6 sm:p-8 lg:grid-cols-[1.07fr_1fr_1fr]">
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
        <BackgroundGradient className="brand-surface isolate overflow-hidden p-6 sm:p-8">
          <GridPattern className="text-white/20 mask-[linear-gradient(to_left,#000,transparent_70%)]" />
          <h2 className="relative font-heading text-3xl font-semibold">¿Tienes ganado para vender?</h2>
          <p className="relative mt-2 max-w-lg text-white/85">
            Registra tu finca, publica lotes o ejemplares con fotos y recibe consultas de compradores de
            todo el país. Publicar es gratis.
          </p>
          <a
            href={`${GANADERO_URL}/registro`}
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "relative mt-6 h-10 px-4")}
          >
            Publicar mi ganado <ArrowRight />
          </a>
        </BackgroundGradient>
        <Link
          to="/servicios"
          className="brand-lift flex flex-col justify-between rounded-2xl border bg-card p-6 hover:border-primary/50 sm:p-8"
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b pb-3">
      <h2 className="flex items-center gap-2 font-heading text-3xl font-semibold tracking-tight">
        {Icon && <Icon className="size-6 text-primary" />}
        {title}
      </h2>
      <Link to={href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        {cta} <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
