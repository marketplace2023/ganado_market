import { useQuery } from "@tanstack/react-query"
import type { GanaderoStats } from "@workspace/shared"
import { buttonVariants } from "@workspace/ui/components/button"
import { DashboardShell, type NavGroup } from "@workspace/ui/components/dashboard-shell"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  ExternalLink,
  Fence,
  Gavel,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Plus,
  UserRound,
} from "lucide-react"
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router"
import { WEB_URL, api, useAuth } from "@/lib/api"

export function PanelLayout() {
  const { user, isLoading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<GanaderoStats>("/ganadero/stats"),
    enabled: Boolean(user),
  })

  if (isLoading) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Skeleton className="h-8 w-40" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  const nav: NavGroup[] = [
    {
      label: "General",
      items: [{ title: "Resumen", href: "/", icon: LayoutDashboard }],
    },
    {
      label: "Mi negocio",
      items: [
        { title: "Mis fincas", href: "/fincas", icon: Fence },
        { title: "Mis anuncios", href: "/anuncios", icon: Megaphone },
        { title: "Consultas", href: "/consultas", icon: Inbox, badge: stats.data?.consultasNuevas },
        { title: "Solicitudes de compra", href: "/solicitudes", icon: ClipboardList },
        { title: "Remates", href: "/subastas", icon: Gavel },
      ],
    },
    {
      label: "Cuenta",
      items: [{ title: "Mi perfil", href: "/perfil", icon: UserRound }],
    },
  ]

  return (
    <DashboardShell
      subtitle="Panel del ganadero"
      nav={nav}
      currentPath={location.pathname}
      renderLink={({ href, className, children, onClick, current }) => (
        <Link to={href} className={className} onClick={onClick} aria-current={current}>
          {children}
        </Link>
      )}
      user={{ name: user.name, roleLabel: "Ganadero" }}
      onLogout={() => {
        logout()
        navigate("/login")
      }}
      headerRight={
        <>
          <a
            href={WEB_URL}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            aria-label="Ver marketplace"
          >
            <span className="hidden sm:inline">Marketplace</span> <ExternalLink />
          </a>
          <Link to="/anuncios/nuevo" className={buttonVariants({ size: "sm" })}>
            <Plus /> Publicar
          </Link>
        </>
      }
    >
      <Outlet />
    </DashboardShell>
  )
}
