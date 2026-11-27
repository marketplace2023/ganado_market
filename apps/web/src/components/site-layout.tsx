import { ESTADOS_GANADEROS, estadoName, whatsappUrl } from "@workspace/shared"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Logo } from "@workspace/ui/components/logo"
import { cn } from "cn"
import { ClipboardList, Heart, LogOut, Menu, Plus, User, X } from "lucide-react"
import { useState } from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router"
import { GANADERO_URL, useAuth, useSettings } from "@/lib/api"

const NAV = [
  { to: "/ganado", label: "Comprar ganado" },
  { to: "/fincas", label: "Fincas" },
  { to: "/subastas", label: "Remates" },
  { to: "/solicitudes", label: "Solicitudes" },
  { to: "/servicios", label: "Servicios" },
]

export function SiteLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const navLink = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-lg px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring",
      isActive ? "bg-secondary text-primary" : "text-foreground/75 hover:bg-secondary/60 hover:text-foreground"
    )

  return (
    <div className="flex min-h-svh flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b border-t-[3px] border-t-[#315d43] bg-card/95 backdrop-blur">
        <div className="mx-auto flex min-h-[4.1rem] max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" aria-label="Inicio" className="shrink-0 rounded-md focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>
          <nav aria-label="Navegación principal" className="ml-3 hidden items-center lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={navLink}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            {user ? (
              <>
                <Link to="/favoritos" className={buttonVariants({ variant: "ghost", size: "sm" })} title="Favoritos">
                  <Heart /> <span className="hidden xl:inline">Favoritos</span>
                </Link>
                <Link to="/mis-solicitudes" className={buttonVariants({ variant: "ghost", size: "sm" })} title="Mis solicitudes">
                  <ClipboardList /> <span className="hidden xl:inline">Mis solicitudes</span>
                </Link>
                <span className="text-sm text-muted-foreground">Hola, {user.name.split(" ")[0]}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Cerrar sesión"
                  onClick={() => {
                    logout()
                    navigate("/")
                  }}
                >
                  <LogOut />
                </Button>
              </>
            ) : (
              <Link to="/ingresar" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <User /> Ingresar
              </Link>
            )}
            <a href={`${GANADERO_URL}/registro`} className={cn(buttonVariants({ size: "lg" }), "h-10 px-3.5")}>
              <Plus /> Vender ganado
            </a>
          </div>
          <button
            type="button"
            className="ml-auto rounded-md p-2 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menú"
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open && (
          <div className="border-t px-4 py-3 lg:hidden" onClick={() => setOpen(false)}>
            <nav aria-label="Navegación principal" className="flex flex-col">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={navLink}>
                  {n.label}
                </NavLink>
              ))}
              {user ? (
                <>
                  <NavLink to="/favoritos" className={navLink}>
                    Favoritos
                  </NavLink>
                  <NavLink to="/mis-solicitudes" className={navLink}>
                    Mis solicitudes
                  </NavLink>
                  <button className="px-3 py-2 text-left text-sm text-foreground/70" onClick={logout}>
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <NavLink to="/ingresar" className={navLink}>
                  Ingresar
                </NavLink>
              )}
            </nav>
            <a
              href={`${GANADERO_URL}/registro`}
              className={cn(buttonVariants({ size: "lg" }), "mt-3 w-full")}
            >
              <Plus /> Vender ganado
            </a>
          </div>
        )}
      </header>

      <main id="contenido" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  )
}

function SiteFooter() {
  const { data: settings } = useSettings()
  const soporte = settings?.whatsappSoporte ? whatsappUrl(settings.whatsappSoporte) : null
  return (
    <footer className="mt-16 border-t-4 border-t-[#9cae8e] bg-[#e9eee2]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">
            El mercado ganadero de Venezuela: lotes y ejemplares de todo el país, remates virtuales y
            contacto directo con el productor.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Ganado por estado</p>
          <ul className="grid grid-cols-2 gap-1.5 text-sm text-muted-foreground">
            {ESTADOS_GANADEROS.slice(0, 8).map((e) => (
              <li key={e}>
                <Link className="hover:text-foreground" to={`/ganado?estado=${e}`}>
                  {estadoName(e)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Marketplace</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" to="/ganado">Comprar ganado</Link></li>
            <li><Link className="hover:text-foreground" to="/fincas">Fincas</Link></li>
            <li><Link className="hover:text-foreground" to="/subastas">Remates virtuales</Link></li>
            <li><Link className="hover:text-foreground" to="/solicitudes">Solicitudes de compra</Link></li>
            <li><Link className="hover:text-foreground" to="/servicios">Transporte y veterinarios</Link></li>
            <li><Link className="hover:text-foreground" to="/contacto">Contacto y ayuda</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Ganaderos</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li><a className="hover:text-foreground" href={`${GANADERO_URL}/registro`}>Publica tu ganado gratis</a></li>
            <li><a className="hover:text-foreground" href={GANADERO_URL}>Panel del ganadero</a></li>
            {soporte && (
              <li><a className="hover:text-foreground" href={soporte} target="_blank" rel="noreferrer">Soporte por WhatsApp</a></li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        GanadoMarket Venezuela · {new Date().getFullYear()} ·{" "}
        <Link to="/terminos" className="hover:text-foreground">Términos</Link> ·{" "}
        <Link to="/privacidad" className="hover:text-foreground">Privacidad</Link> · Verifica siempre la guía de
        movilización y el estado sanitario antes de cerrar un negocio.
      </div>
    </footer>
  )
}
