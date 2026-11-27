import type { ReactNode } from "react"
import { GridPattern } from "@workspace/ui/components/grid-pattern"

export function DirectoryHeading({
  title,
  children,
  count,
}: {
  title: string
  children?: ReactNode
  count?: string
}) {
  return (
    <header className="relative isolate mb-6 overflow-hidden rounded-2xl border border-[#cdd9c4] bg-[#eaf0e2] p-5 text-[#20372c] sm:p-7">
      <GridPattern
        size={25}
        className="mask-[linear-gradient(to_left,#000,transparent_76%)] text-[#315d43]/15"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl leading-none font-semibold tracking-tight text-balance sm:text-[3.25rem]">
            {title}
          </h1>
          {count && (
            <p className="mt-2 text-sm font-medium text-[#465d50]">{count}</p>
          )}
        </div>
        {children}
      </div>
    </header>
  )
}
