import { useQuery } from "@tanstack/react-query"
import type { AdminStats } from "@workspace/shared"
import { buttonVariants } from "@workspace/ui/components/button"
import { DashboardShell, type NavGroup } from "@workspace/ui/components/dashboard-shell"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  ExternalLink,
  Fence,
  Gavel,
  LayoutDashboard,
  Megaphone,
  Settings,
  ClipboardList,
  Flag,
  History,
  Tags,
  Truck,
  Users,
} from "lucide-react"
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router"
import { WEB_URL, api, useAuth } from "@/lib/api"

export function AdminLayout() {
  const { user, isLoading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats"),
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
    { label: "General", items: [{ title: "Resumen", href: "/", icon: LayoutDashboard }] },
    {
      label: "Moderación",
      items: [
        { title: "Anuncios", href: "/anuncios", icon: Megaphone, badge: stats.data?.anunciosPendientes },
        { title: "Fincas", href: "/fincas", icon: Fence, badge: stats.data?.fincasPendientes },
        { title: "Remates", href: "/subastas", icon: Gavel, badge: stats.data?.subastasPendientes },
        { title: "Solicitudes", href: "/solicitudes", icon: ClipboardList },
        { title: "Denuncias", href: "/denuncias", icon: Flag, badge: stats.data?.denunciasPendientes },
      ],
    },
    {
      label: "Ecosistema",
      items: [
        { title: "Usuarios", href: "/usuarios", icon: Users },
        { title: "Servicios", href: "/servicios", icon: Truck },
        { title: "Especies y razas", href: "/catalogo", icon: Tags },
      ],
    },
    {
      label: "Sistema",
      items: [
        { title: "Historial", href: "/historial", icon: History },
        { title: "Configuración", href: "/configuracion", icon: Settings },
      ],
    },
  ]

  return (
    <DashboardShell
      subtitle="Administración"
      nav={nav}
      currentPath={location.pathname}
      renderLink={({ href, className, children, onClick, current }) => (
        <Link to={href} className={className} onClick={onClick} aria-current={current}>
          {children}
        </Link>
      )}
      user={{ name: user.name, roleLabel: "Administrador" }}
      onLogout={() => {
        logout()
        navigate("/login")
      }}
      headerRight={
        <a href={WEB_URL} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <span>Marketplace</span> <ExternalLink />
        </a>
      }
    >
      <Outlet />
    </DashboardShell>
  )
}
