import { useEffect, useRef } from "react"
import {
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react"
import { formatNumber } from "@workspace/shared"

// Magic UI Number Ticker, adapted from https://magicui.design/r/number-ticker.json.
export function NumberTicker({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reducedMotion = useReducedMotion()
  const inView = useInView(ref, { once: true })
  const target = useMotionValue(0)
  const spring = useSpring(target, { damping: 34, stiffness: 160 })

  useEffect(() => {
    if (!inView || reducedMotion) return
    return spring.on("change", (latest) => {
      if (ref.current)
        ref.current.textContent = formatNumber(Math.round(latest))
    })
  }, [inView, reducedMotion, spring])

  useEffect(() => {
    if (inView && !reducedMotion) target.set(value)
  }, [inView, reducedMotion, target, value])

  if (reducedMotion) return <>{formatNumber(value)}</>
  return (
    <>
      <span className="sr-only">{formatNumber(value)}</span>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        0
      </span>
    </>
  )
}
