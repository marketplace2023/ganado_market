import { useId } from "react"
import { cn } from "cn"

// Magic UI Grid Pattern, adapted from https://magicui.design/r/grid-pattern.json.
export function GridPattern({
  className,
  size = 32,
}: {
  className?: string
  size?: number
}) {
  const id = useId()
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 size-full stroke-current",
        className
      )}
    >
      <defs>
        <pattern
          id={id}
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          x="-1"
          y="-1"
        >
          <path d={`M.5 ${size} V.5 H${size}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} stroke="none" />
    </svg>
  )
}
