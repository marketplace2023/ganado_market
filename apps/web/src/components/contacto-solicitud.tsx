import { useMutation } from "@tanstack/react-query"
import { whatsappUrl, type Solicitud, type SolicitudContacto } from "@workspace/shared"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { cn } from "cn"
import { MessageCircle, Phone } from "lucide-react"
import { Link, useLocation } from "react-router"
import { toast } from "sonner"
import { GANADERO_URL, api, useAuth } from "@/lib/api"

/**
 * Botón "Contactar" de una solicitud de compra.
 * - Visitante: lo lleva a iniciar sesión.
 * - Comprador sin rol ganadero: le invita a registrarse como ganadero.
 * - Ganadero: revela el WhatsApp del comprador (queda registrado).
 */
export function ContactoSolicitud({ solicitud }: { solicitud: Solicitud }) {
  const { user } = useAuth()
  const location = useLocation()
  const ver = useMutation({
    mutationFn: () => api.get<SolicitudContacto>(`/solicitudes/${solicitud.id}/contacto`),
    onError: (e) => toast.error(e.message),
  })

  if (!user) {
    return (
      <Link to="/ingresar" state={{ from: location.pathname }} className={buttonVariants({ size: "sm", variant: "outline" })}>
        Inicia sesión para contactar
      </Link>
    )
  }
  if (!user.roles.includes("ganadero") && !user.roles.includes("admin")) {
    return (
      <a href={`${GANADERO_URL}/registro`} className={buttonVariants({ size: "sm", variant: "outline" })} title="Sólo ganaderos pueden ver el contacto">
        Soy ganadero
      </a>
    )
  }
  if (ver.data) {
    const wa = ver.data.phone
      ? whatsappUrl(ver.data.phone, `Hola ${ver.data.name.split(" ")[0]}, vi tu solicitud "${solicitud.title}" en GanadoMarket. Tengo lo que buscas.`)
      : null
    return wa ? (
      <a href={wa} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }), "bg-[#25D366] text-white hover:bg-[#1fb857]")}>
        <MessageCircle /> WhatsApp
      </a>
    ) : (
      <a href={`mailto:${ver.data.email}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
        <Phone /> {ver.data.email}
      </a>
    )
  }
  return (
    <Button size="sm" onClick={() => ver.mutate()} disabled={ver.isPending}>
      Ver contacto
    </Button>
  )
}
