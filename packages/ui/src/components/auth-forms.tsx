import * as React from "react"
import {
  ApiError,
  issuesToFieldErrors,
  loginDto,
  registerDto,
  resetPasswordDto,
  type LoginDto,
  type RegisterDto,
  type ResetPasswordDto,
} from "@workspace/shared"
import { AlertCircle } from "lucide-react"
import { cn } from "cn"
import { Button } from "./button"
import { FormField } from "./form-field"
import { Input } from "./input"
import { Logo } from "./logo"
import { NativeSelect, NativeSelectOption } from "./native-select"

/** Panel de marca junto al formulario en escritorio y sobre el formulario en móvil cuando hay imagen. */
export function AuthLayout({
  subtitle,
  headline,
  description,
  image,
  children,
}: {
  subtitle?: string
  headline: string
  description: string
  image?: { src: string; position?: string }
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <aside className={cn(
        "relative isolate flex-col justify-between overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:w-[46%] lg:shrink-0",
        image
          ? "flex min-h-36 p-6 sm:min-h-48 lg:sticky lg:top-0 lg:h-svh lg:self-start lg:p-10 xl:p-12"
          : "hidden p-10"
      )}>
        {image ? (
          <>
            <img
              src={image.src}
              alt=""
              fetchPriority="high"
              className="absolute inset-0 -z-10 size-full object-cover"
              style={{ objectPosition: image.position ?? "center 46%" }}
            />
            <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-black/75 via-black/10 to-black/85" />
          </>
        ) : (
          <div className="pointer-events-none absolute -bottom-32 -left-24 size-[28rem] rounded-full bg-sidebar-primary/10 blur-3xl" />
        )}
        <Logo subtitle={subtitle} inverted className="relative" />
        <div className={cn("relative", image && "hidden lg:block")}>
          <h2 className="max-w-md text-4xl leading-tight font-semibold text-balance">{headline}</h2>
          <p className={cn("mt-4 max-w-sm", image ? "text-white/90" : "text-sidebar-foreground/70")}>
            {description}
          </p>
        </div>
        {!image && <p className="text-xs text-sidebar-foreground/40">GanadoMarket Venezuela</p>}
      </aside>
      <div className={cn("flex flex-1 justify-center p-6 sm:p-10", image ? "items-start lg:items-center" : "items-center")}>
        <div className="w-full max-w-sm">
          {!image && (
            <div className="mb-8 lg:hidden">
              <Logo subtitle={subtitle} />
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

function useFormState<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = React.useState(initial)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const bind = (name: keyof T & string) => ({
    id: name,
    name,
    value: values[name],
    "aria-invalid": Boolean(errors[name]) || undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [name]: e.target.value })),
  })

  async function run(fn: () => Promise<void>) {
    setPending(true)
    setFormError(null)
    try {
      await fn()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length) setErrors(err.fieldErrors())
      else setFormError(err instanceof Error ? err.message : "Ocurrió un error")
    } finally {
      setPending(false)
    }
  }
  return { values, errors, setErrors, formError, pending, bind, run }
}

function FormAlert({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {message}
    </div>
  )
}

export function LoginForm({
  onSubmit,
  footer,
  forgotLink,
  title = "Bienvenido de vuelta",
  description = "Ingresa con tu correo y contraseña.",
}: {
  onSubmit: (dto: LoginDto) => Promise<unknown>
  footer?: React.ReactNode
  /** Enlace "¿Olvidaste tu contraseña?" (cada app pasa su <Link>). */
  forgotLink?: React.ReactNode
  title?: string
  description?: string
}) {
  const f = useFormState({ email: "", password: "" })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = loginDto.safeParse(f.values)
    if (!parsed.success) return f.setErrors(issuesToFieldErrors(parsed.error.issues))
    f.setErrors({})
    f.run(async () => {
      await onSubmit(parsed.data)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <FormAlert message={f.formError} />
      <FormField label="Correo electrónico" htmlFor="email" error={f.errors.email}>
        <Input type="email" autoComplete="email" className="h-10" {...f.bind("email")} />
      </FormField>
      <FormField label="Contraseña" htmlFor="password" error={f.errors.password}>
        <Input type="password" autoComplete="current-password" className="h-10" {...f.bind("password")} />
      </FormField>
      {forgotLink && <div className="-mt-1 text-right text-sm">{forgotLink}</div>}
      <Button type="submit" size="lg" className="h-10 w-full" disabled={f.pending}>
        {f.pending ? "Ingresando…" : "Ingresar"}
      </Button>
      {footer && <div className="pt-2 text-center text-sm text-muted-foreground">{footer}</div>}
    </form>
  )
}

export function RegisterForm({
  role,
  onSubmit,
  footer,
  title,
  description,
  termsLink,
}: {
  role: RegisterDto["role"]
  onSubmit: (dto: RegisterDto) => Promise<unknown>
  footer?: React.ReactNode
  title: string
  description: string
  /** Si se pasa, exige aceptar los términos (p. ej. <a href="/terminos">términos</a>). */
  termsLink?: React.ReactNode
}) {
  const f = useFormState({
    name: "",
    email: "",
    phone: "",
    documentType: "cedula",
    documentNumber: "",
    password: "",
  })
  const [accepted, setAccepted] = React.useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = registerDto.safeParse({ ...f.values, role })
    const errors = parsed.success ? {} : issuesToFieldErrors(parsed.error.issues)
    if (termsLink && !accepted) errors.terms = "Debes aceptar los términos para continuar"
    if (!parsed.success || errors.terms) return f.setErrors(errors)
    f.setErrors({})
    f.run(async () => {
      await onSubmit(parsed.data)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <FormAlert message={f.formError} />
      <FormField label="Nombre y apellido" htmlFor="name" error={f.errors.name}>
        <Input autoComplete="name" {...f.bind("name")} />
      </FormField>
      <FormField label="Correo electrónico" htmlFor="email" error={f.errors.email}>
        <Input type="email" autoComplete="email" {...f.bind("email")} />
      </FormField>
      <FormField label="Teléfono / WhatsApp" htmlFor="phone" error={f.errors.phone} hint="Ej. 0414-1234567">
        <Input inputMode="tel" autoComplete="tel" placeholder="0414-1234567" {...f.bind("phone")} />
      </FormField>
      <div className="grid grid-cols-[110px_1fr] gap-2">
        <FormField label="Documento" htmlFor="documentType">
          <NativeSelect className="w-full" {...f.bind("documentType")}>
            <NativeSelectOption value="cedula">Cédula</NativeSelectOption>
            <NativeSelectOption value="rif">RIF</NativeSelectOption>
          </NativeSelect>
        </FormField>
        <FormField label="Número" htmlFor="documentNumber" error={f.errors.documentNumber}>
          <Input
            placeholder={f.values.documentType === "rif" ? "J-12345678-9" : "V-12345678"}
            {...f.bind("documentNumber")}
          />
        </FormField>
      </div>
      <FormField label="Contraseña" htmlFor="password" error={f.errors.password} hint="Mínimo 8 caracteres">
        <Input type="password" autoComplete="new-password" {...f.bind("password")} />
      </FormField>
      {termsLink && (
        <div>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={accepted}
              onChange={(e) => {
                setAccepted(e.target.checked)
                if (e.target.checked) f.setErrors((errs) => ({ ...errs, terms: "" }))
              }}
            />
            <span className="text-muted-foreground">Acepto los {termsLink} y la política de privacidad.</span>
          </label>
          {f.errors.terms && <p className="mt-1 text-xs text-destructive">{f.errors.terms}</p>}
        </div>
      )}
      <Button type="submit" size="lg" className="h-10 w-full" disabled={f.pending}>
        {f.pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
      {footer && <div className="pt-2 text-center text-sm text-muted-foreground">{footer}</div>}
    </form>
  )
}

/** Pide el enlace de recuperación. Siempre muestra el mismo mensaje (no revela si el correo existe). */
export function ForgotPasswordForm({
  onSubmit,
  footer,
}: {
  onSubmit: (email: string) => Promise<unknown>
  footer?: React.ReactNode
}) {
  const f = useFormState({ email: "" })
  const [sent, setSent] = React.useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = loginDto.shape.email.safeParse(f.values.email)
    if (!parsed.success) return f.setErrors({ email: parsed.error.issues[0]?.message ?? "Correo inválido" })
    f.setErrors({})
    f.run(async () => {
      await onSubmit(parsed.data)
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Revisa tu correo</h1>
        <p className="text-sm text-muted-foreground">
          Si <strong className="text-foreground">{f.values.email}</strong> tiene una cuenta, te enviamos un enlace para
          crear una nueva contraseña. Vence en 1 hora; revisa también la carpeta de spam.
        </p>
        {footer && <div className="pt-2 text-sm text-muted-foreground">{footer}</div>}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">¿Olvidaste tu contraseña?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escribe tu correo y te enviaremos un enlace para restablecerla.</p>
      </div>
      <FormAlert message={f.formError} />
      <FormField label="Correo electrónico" htmlFor="email" error={f.errors.email}>
        <Input type="email" autoComplete="email" className="h-10" {...f.bind("email")} />
      </FormField>
      <Button type="submit" size="lg" className="h-10 w-full" disabled={f.pending}>
        {f.pending ? "Enviando…" : "Enviar enlace"}
      </Button>
      {footer && <div className="pt-2 text-center text-sm text-muted-foreground">{footer}</div>}
    </form>
  )
}

export function ResetPasswordForm({
  token,
  onSubmit,
  onDone,
}: {
  token: string
  onSubmit: (dto: ResetPasswordDto) => Promise<unknown>
  onDone: React.ReactNode
}) {
  const f = useFormState({ password: "", confirm: "" })
  const [done, setDone] = React.useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = resetPasswordDto.safeParse({ token, password: f.values.password })
    const errors = parsed.success ? {} : issuesToFieldErrors(parsed.error.issues)
    if (f.values.confirm !== f.values.password) errors.confirm = "Las contraseñas no coinciden"
    if (!parsed.success || errors.confirm) {
      if (errors.token) errors.token = "El enlace no es válido. Solicita uno nuevo."
      return f.setErrors(errors)
    }
    f.setErrors({})
    f.run(async () => {
      await onSubmit(parsed.data)
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Contraseña actualizada</h1>
        <p className="text-sm text-muted-foreground">Ya puedes ingresar con tu nueva contraseña.</p>
        {onDone}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Crea una nueva contraseña</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>
      <FormAlert message={f.formError ?? (f.errors.token ? f.errors.token : null)} />
      <FormField label="Nueva contraseña" htmlFor="password" error={f.errors.password}>
        <Input type="password" autoComplete="new-password" className="h-10" {...f.bind("password")} />
      </FormField>
      <FormField label="Repite la contraseña" htmlFor="confirm" error={f.errors.confirm}>
        <Input type="password" autoComplete="new-password" className="h-10" {...f.bind("confirm")} />
      </FormField>
      <Button type="submit" size="lg" className="h-10 w-full" disabled={f.pending}>
        {f.pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  )
}
