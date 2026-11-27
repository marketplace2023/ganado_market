import { AuthLayout, ForgotPasswordForm, LoginForm, ResetPasswordForm } from "@workspace/ui/components/auth-forms"
import { buttonVariants } from "@workspace/ui/components/button"
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router"
import { api, useAuth } from "@/lib/api"

const HEADLINE = "Modera y cuida el mercado ganadero."
const DESCRIPTION =
  "Aprueba anuncios y remates, verifica fincas, gestiona usuarios y revisa las solicitudes de compra."
const linkCls = "font-medium text-primary hover:underline"
const loginImage = new URL("../assets/auth/admin-ingreso.webp", import.meta.url).href

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? "/"
  if (user) return <Navigate to={from} replace />

  return (
    <AuthLayout subtitle="Administración" headline={HEADLINE} description={DESCRIPTION} image={{ src: loginImage }}>
      <LoginForm
        description="Acceso exclusivo para administradores."
        forgotLink={<Link to="/recuperar" className={linkCls}>¿Olvidaste tu contraseña?</Link>}
        onSubmit={async (dto) => {
          await login(dto)
          navigate(from, { replace: true })
        }}
      />
    </AuthLayout>
  )
}

export function RecuperarPage() {
  return (
    <AuthLayout subtitle="Administración" headline={HEADLINE} description={DESCRIPTION}>
      <ForgotPasswordForm
        onSubmit={(email) => api.post("/auth/forgot-password", { email, app: "admin" })}
        footer={<Link className={linkCls} to="/login">Volver a ingresar</Link>}
      />
    </AuthLayout>
  )
}

export function RestablecerPage() {
  const [params] = useSearchParams()
  return (
    <AuthLayout subtitle="Administración" headline={HEADLINE} description={DESCRIPTION}>
      <ResetPasswordForm
        token={params.get("token") ?? ""}
        onSubmit={(dto) => api.post("/auth/reset-password", dto)}
        onDone={<Link to="/login" className={buttonVariants({ size: "lg" })}>Ingresar</Link>}
      />
    </AuthLayout>
  )
}
