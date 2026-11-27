import type { ReactNode } from "react"
import { cn } from "cn"

// Aceternity UI Background Gradient, adapted from
// https://ui.aceternity.com/registry/background-gradient.json.
export function BackgroundGradient({
  children,
  className,
  containerClassName,
}: {
  children: ReactNode
  className?: string
  containerClassName?: string
}) {
  return (
    <div className={cn("brand-gradient", containerClassName)}>
      <div aria-hidden="true" className="brand-gradient-halo" />
      <div className={cn("relative h-full rounded-[inherit]", className)}>
        {children}
      </div>
    </div>
  )
}
