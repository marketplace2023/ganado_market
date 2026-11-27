import * as React from "react"
import { cn } from "cn"
import { STATUS_TONE, type Tone } from "@workspace/shared"
import { Label } from "./label"

type ControlProps = {
  id?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

/**
 * Etiqueta + control + mensaje de error/ayuda. Si el hijo es un único control,
 * le asigna id, aria-invalid y aria-describedby para que la etiqueta y el error
 * queden asociados (lectores de pantalla y getByLabel).
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: React.ReactNode
  htmlFor?: string
  error?: string
  hint?: React.ReactNode
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  const autoId = React.useId()
  const isControl = React.isValidElement<ControlProps>(children)
  const id = htmlFor ?? (isControl ? (children.props.id ?? autoId) : undefined)
  const messageId = `${autoId}-msg`
  const control = isControl
    ? React.cloneElement(children, {
        id,
        "aria-invalid": error ? true : children.props["aria-invalid"],
        "aria-describedby": error || hint ? messageId : undefined,
      })
    : children

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {control}
      {error ? (
        <p id={messageId} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Casilla con texto (checkbox nativo, accesible). */
export function CheckboxField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 hover:bg-muted/50 has-checked:border-primary/40 has-checked:bg-primary/5">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  )
}

const TONES: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  gray: "bg-muted text-muted-foreground",
  blue: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone = STATUS_TONE[status] ?? "gray"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone]
      )}
    >
      {status === "en_vivo" && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {label}
    </span>
  )
}
