import {
  AuthLayout,
  ForgotPasswordForm,
  LoginForm,
  RegisterForm,
  ResetPasswordForm,
} from "@workspace/ui/components/auth-forms"
import { buttonVariants } from "@workspace/ui/components/button"
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router"
import { WEB_URL, api, useAuth } from "@/lib/api"

const HEADLINE = "Vende tu ganado a compradores de toda Venezuela."
const DESCRIPTION =
  "Publica lotes y ejemplares con fotos, responde solicitudes de compra y organiza remates virtuales desde tu finca."
const linkCls = "font-medium text-primary hover:underline"
const loginImage = new URL("../assets/auth/ganadero-ingreso.webp", import.meta.url).href
const registerImage = new URL("../assets/auth/ganadero-registro.webp", import.meta.url).href

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? "/"
  if (user) return <Navigate to={from} replace />

  return (
    <AuthLayout
      subtitle="Panel del ganadero"
      headline={HEADLINE}
      description={DESCRIPTION}
      image={{ src: loginImage, position: "center 37%" }}
    >
      <LoginForm
        description="Ingresa a tu panel de ganadero."
        onSubmit={async (dto) => {
          await login(dto)
          navigate(from, { replace: true })
        }}
        forgotLink={<Link to="/recuperar" className={linkCls}>¿Olvidaste tu contraseña?</Link>}
        footer={
          <>
            ¿Primera vez? <Link to="/registro" className={linkCls}>Registra tu finca gratis</Link>
          </>
        }
      />
    </AuthLayout>
  )
}

export function RegistroPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  if (user) return <Navigate to="/" replace />

  return (
    <AuthLayout subtitle="Panel del ganadero" headline={HEADLINE} description={DESCRIPTION} image={{ src: registerImage }}>
      <RegisterForm
        role="ganadero"
        title="Crea tu cuenta de ganadero"
        description="Publicar es gratis. Luego registras tu finca y tus anuncios."
        termsLink={<a href={`${WEB_URL}/terminos`} target="_blank" rel="noreferrer" className={linkCls}>términos de uso</a>}
        onSubmit={async (dto) => {
          await register(dto)
          navigate("/fincas/nueva", { replace: true })
        }}
        footer={
          <>
            ¿Ya tienes cuenta? <Link to="/login" className={linkCls}>Ingresa</Link>
          </>
        }
      />
    </AuthLayout>
  )
}

export function RecuperarPage() {
  return (
    <AuthLayout subtitle="Panel del ganadero" headline={HEADLINE} description={DESCRIPTION}>
      <ForgotPasswordForm
        onSubmit={(email) => api.post("/auth/forgot-password", { email, app: "ganadero" })}
        footer={<Link className={linkCls} to="/login">Volver a ingresar</Link>}
      />
    </AuthLayout>
  )
}

export function RestablecerPage() {
  const [params] = useSearchParams()
  return (
    <AuthLayout subtitle="Panel del ganadero" headline={HEADLINE} description={DESCRIPTION}>
      <ResetPasswordForm
        token={params.get("token") ?? ""}
        onSubmit={(dto) => api.post("/auth/reset-password", dto)}
        onDone={<Link to="/login" className={buttonVariants({ size: "lg" })}>Ingresar</Link>}
      />
    </AuthLayout>
  )
}
