import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { cn } from "cn"
import { ChevronRight, LogOut, Menu, X, type LucideIcon } from "lucide-react"
import { GridPattern } from "./grid-pattern"
import { Logo } from "./logo"

export type NavItem = { title: string; href: string; icon: LucideIcon; badge?: number }
export type NavGroup = { label: string; items: NavItem[] }

type LinkRenderer = (props: {
  href: string
  className: string
  children: React.ReactNode
  onClick?: () => void
  current?: "page" | "location"
}) => React.ReactNode

/**
 * Layout con barra lateral compartido por el panel ganadero y el panel admin.
 * No depende de react-router: cada app inyecta su componente de link y la ruta actual.
 */
export function DashboardShell({
  subtitle,
  nav,
  currentPath,
  renderLink,
  user,
  onLogout,
  headerRight,
  children,
}: {
  subtitle: string
  nav: NavGroup[]
  currentPath: string
  renderLink: LinkRenderer
  user: { name: string; roleLabel: string }
  onLogout: () => void
  headerRight?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const isActive = (href: string) =>
    href === "/" ? currentPath === "/" : currentPath === href || currentPath.startsWith(href + "/")
  const currentGroup = nav.find((group) => group.items.some((item) => isActive(item.href)))
  const currentItem = currentGroup?.items.find((item) => isActive(item.href))
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="relative isolate overflow-hidden border-b border-sidebar-border px-5 py-6">
        <GridPattern size={22} className="text-sidebar-primary/13 mask-[linear-gradient(to_left,#000,transparent_80%)]" />
        {renderLink({
          href: "/",
          onClick: () => setOpen(false),
          className: "relative inline-flex rounded-lg focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          children: <Logo subtitle={subtitle} inverted />,
        })}
      </div>
      <nav aria-label={subtitle} className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {nav.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-wide text-sidebar-foreground/65">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <li key={item.href}>
                    {renderLink({
                      href: item.href,
                      current: active ? (currentPath === item.href ? "page" : "location") : undefined,
                      onClick: () => setOpen(false),
                      className: cn(
                        "relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-inset ring-sidebar-primary/20"
                          : "text-sidebar-foreground/78 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      ),
                      children: (
                        <>
                          <item.icon
                            className={cn(
                              "size-4 shrink-0",
                              active ? "text-sidebar-primary" : "text-sidebar-foreground/70"
                            )}
                          />
                          <span className="flex-1 truncate">{item.title}</span>
                          {item.badge ? (
                            <span className="rounded-md bg-sidebar-primary px-1.5 py-0.5 text-[11px] font-semibold text-sidebar-primary-foreground tabular-nums">
                              {item.badge}
                            </span>
                          ) : null}
                        </>
                      ),
                    })}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/50 px-2.5 py-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="text-[11px] text-sidebar-foreground/70">{user.roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-svh bg-background">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">
        Saltar al contenido
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">{sidebar}</aside>
      <div className="min-w-0 lg:pl-60">
        <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
          <div className="mx-auto flex min-h-16 max-w-[90rem] items-center gap-2 px-4 sm:gap-4 sm:px-7">
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger aria-label="Abrir menú" className="-ml-1 rounded-lg p-2 text-foreground hover:bg-muted lg:hidden">
                <Menu className="size-5" />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
                <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-72 max-w-[90vw] shadow-xl">
                  <Dialog.Title className="sr-only">Menú de {subtitle}</Dialog.Title>
                  <Dialog.Close aria-label="Cerrar menú" className="absolute top-5 right-3 z-10 rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent">
                    <X className="size-5" />
                  </Dialog.Close>
                  {sidebar}
                </Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              {currentGroup && (
                <span className="hidden items-center gap-2 text-muted-foreground sm:inline-flex">
                  {currentGroup.label} <ChevronRight className="size-3.5" />
                </span>
              )}
              <span className="truncate font-semibold">{currentItem?.title ?? subtitle}</span>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">{headerRight}</div>
          </div>
        </header>
        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-7 lg:py-8">{children}</main>
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  hint?: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs leading-snug font-medium text-muted-foreground sm:text-sm">{label}</p>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-auto pt-2">
        <p className="text-3xl leading-none font-semibold tracking-tight tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-14 text-center">
      <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
