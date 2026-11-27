import {
  AuthLayout,
  ForgotPasswordForm,
  LoginForm,
  RegisterForm,
  ResetPasswordForm,
} from "@workspace/ui/components/auth-forms"
import { buttonVariants } from "@workspace/ui/components/button"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router"
import { GANADERO_URL, api, useAuth } from "@/lib/api"

const HEADLINE = "El ganado de toda Venezuela en un solo lugar."
const DESCRIPTION = "Guarda favoritos, publica lo que buscas y participa en remates virtuales."
const loginImage = new URL("../assets/auth/comprador-ingreso.webp", import.meta.url).href
const registerImage = new URL("../assets/auth/comprador-registro.webp", import.meta.url).href

function useRedirectBack() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? "/"
  return () => navigate(from, { replace: true })
}

const linkCls = "font-medium text-primary hover:underline"

export function LoginPage() {
  const { login } = useAuth()
  const back = useRedirectBack()
  return (
    <AuthLayout headline={HEADLINE} description={DESCRIPTION} image={{ src: loginImage, position: "center 39%" }}>
      <LoginForm
        onSubmit={async (dto) => {
          await login(dto)
          back()
        }}
        forgotLink={<Link className={linkCls} to="/recuperar">¿Olvidaste tu contraseña?</Link>}
        footer={
          <>
            ¿No tienes cuenta? <Link className={linkCls} to="/registro">Regístrate</Link>
            <br />
            ¿Eres ganadero? <a className={linkCls} href={GANADERO_URL}>Entra a tu panel</a>
          </>
        }
      />
    </AuthLayout>
  )
}

export function RegistroPage() {
  const { register } = useAuth()
  const back = useRedirectBack()
  return (
    <AuthLayout
      headline="Compra ganado con confianza."
      description="Fincas verificadas, información sanitaria en cada anuncio y contacto directo con el productor."
      image={{ src: registerImage, position: "center 34%" }}
    >
      <RegisterForm
        role="comprador"
        title="Crea tu cuenta de comprador"
        description="Gratis. Para guardar favoritos, publicar lo que buscas y pujar en remates."
        termsLink={<Link className={linkCls} to="/terminos" target="_blank">términos de uso</Link>}
        onSubmit={async (dto) => {
          await register(dto)
          back()
        }}
        footer={
          <>
            ¿Ya tienes cuenta? <Link className={linkCls} to="/ingresar">Ingresa</Link>
            <br />
            ¿Quieres vender? <a className={linkCls} href={`${GANADERO_URL}/registro`}>Regístrate como ganadero</a>
          </>
        }
      />
    </AuthLayout>
  )
}

export function RecuperarPage() {
  return (
    <AuthLayout headline={HEADLINE} description={DESCRIPTION}>
      <ForgotPasswordForm
        onSubmit={(email) => api.post("/auth/forgot-password", { email, app: "web" })}
        footer={<Link className={linkCls} to="/ingresar">Volver a ingresar</Link>}
      />
    </AuthLayout>
  )
}

export function RestablecerPage() {
  const [params] = useSearchParams()
  return (
    <AuthLayout headline={HEADLINE} description={DESCRIPTION}>
      <ResetPasswordForm
        token={params.get("token") ?? ""}
        onSubmit={(dto) => api.post("/auth/reset-password", dto)}
        onDone={<Link to="/ingresar" className={buttonVariants({ size: "lg" })}>Ingresar</Link>}
      />
    </AuthLayout>
  )
}
