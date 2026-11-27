import { cn } from "cn"

const logoUrl = new URL("../assets/ganadomarket-mark.png", import.meta.url).href

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      width={32}
      height={32}
      alt=""
      className={cn("size-8 shrink-0 rounded-lg", className)}
    />
  )
}

export function Logo({
  className,
  subtitle,
  inverted,
}: {
  className?: string
  subtitle?: string
  inverted?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[1.05rem] font-bold tracking-tight",
            inverted ? "text-sidebar-foreground" : "text-foreground"
          )}
        >
          Ganado<span className={inverted ? "text-sidebar-primary" : "text-primary"}>Market</span>
        </span>
        {subtitle && (
          <span
            className={cn(
              "mt-1 text-[10px] font-medium tracking-[0.14em] uppercase",
              inverted ? "text-sidebar-foreground/50" : "text-muted-foreground"
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  )
}
