/**
 * Términos, privacidad y contacto.
 * ⚠️ BORRADOR: el texto legal es una base razonable para un marketplace de clasificados,
 * pero debe revisarlo un abogado venezolano antes de publicar en producción.
 */
import { whatsappUrl } from "@workspace/shared"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "cn"
import { Mail, MessageCircle } from "lucide-react"
import { Link } from "react-router"
import { useSettings } from "@/lib/api"

const ACTUALIZADO = "26 de noviembre de 2026"

function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Última actualización: {ACTUALIZADO}</p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/85 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  )
}

export function TerminosPage() {
  return (
    <LegalLayout title="Términos de uso">
      <section>
        <h2>1. Qué es GanadoMarket</h2>
        <p>
          GanadoMarket es una plataforma de anuncios clasificados y remates virtuales que conecta a compradores y
          vendedores de ganado en Venezuela. No somos parte de las operaciones de compraventa: no vendemos animales,
          no recibimos pagos de las transacciones ni cobramos comisión sobre ellas.
        </p>
      </section>
      <section>
        <h2>2. Cuentas</h2>
        <ul>
          <li>Debes ser mayor de edad y dar datos veraces (nombre, cédula o RIF, teléfono).</li>
          <li>Eres responsable de la confidencialidad de tu contraseña y de la actividad de tu cuenta.</li>
          <li>Podemos suspender cuentas que publiquen información falsa, engañosa o que incumplan estos términos.</li>
        </ul>
      </section>
      <section>
        <h2>3. Anuncios y solicitudes</h2>
        <ul>
          <li>Sólo puedes publicar animales que te pertenecen o que estás autorizado a vender.</li>
          <li>
            La información de raza, peso, edad, sanidad (vacunas, desparasitación) y documentos (guía de movilización,
            registro genealógico) es declarada por el vendedor y es de su exclusiva responsabilidad.
          </li>
          <li>Los anuncios y remates se revisan antes de publicarse; podemos rechazarlos o retirarlos indicando el motivo.</li>
          <li>Las fotos deben ser reales y corresponder a los animales ofrecidos.</li>
        </ul>
      </section>
      <section>
        <h2>4. Remates virtuales</h2>
        <ul>
          <li>Cada puja es una oferta de compra firme por el monto indicado.</li>
          <li>Una puja en los últimos 2 minutos extiende el cierre 2 minutos.</li>
          <li>Al cierre, comprador y vendedor acuerdan directamente pesaje, pago, entrega y documentos.</li>
        </ul>
      </section>
      <section>
        <h2>5. Sanidad y movilización</h2>
        <p>
          La movilización de animales requiere los permisos y certificados exigidos por la autoridad sanitaria
          competente. Comprador y vendedor son responsables de tramitarlos y verificarlos antes de trasladar el ganado.
        </p>
      </section>
      <section>
        <h2>6. Precios y tasa de cambio</h2>
        <p>
          Los precios se publican en dólares estadounidenses. El equivalente en bolívares se calcula con la tasa oficial
          del Banco Central de Venezuela y es sólo referencial.
        </p>
      </section>
      <section>
        <h2>7. Limitación de responsabilidad</h2>
        <p>
          GanadoMarket no garantiza la calidad, salud, existencia ni legalidad de los animales anunciados, ni la
          capacidad de pago de los compradores. Recomendamos visitar la finca, revisar los documentos y no hacer pagos
          por adelantado sin verificar el animal.
        </p>
      </section>
      <section>
        <h2>8. Cambios</h2>
        <p>Podemos actualizar estos términos; la fecha de arriba indica la última versión vigente.</p>
      </section>
    </LegalLayout>
  )
}

export function PrivacidadPage() {
  return (
    <LegalLayout title="Política de privacidad">
      <section>
        <h2>Qué datos recogemos</h2>
        <ul>
          <li>Datos de cuenta: nombre, correo, teléfono/WhatsApp, cédula o RIF.</li>
          <li>Datos de tus fincas, anuncios, solicitudes, consultas y pujas.</li>
          <li>Datos de uso: visitas a anuncios y clics en “Contactar por WhatsApp” (para mostrar estadísticas al vendedor).</li>
        </ul>
      </section>
      <section>
        <h2>Para qué los usamos</h2>
        <ul>
          <li>Operar la plataforma y verificar fincas y cuentas.</li>
          <li>Poner en contacto a compradores y vendedores.</li>
          <li>Enviarte avisos sobre tu cuenta (por ejemplo, recuperar tu contraseña).</li>
        </ul>
      </section>
      <section>
        <h2>Qué datos son visibles</h2>
        <ul>
          <li>En tus anuncios se muestra el nombre y el WhatsApp de la finca que publica.</li>
          <li>
            En las solicitudes de compra tu identidad está protegida: sólo se muestra tu nombre recortado, y tu WhatsApp
            únicamente a ganaderos registrados que pidan verlo.
          </li>
          <li>Nunca mostramos tu cédula/RIF ni tu correo en páginas públicas.</li>
        </ul>
      </section>
      <section>
        <h2>Tus derechos</h2>
        <p>
          Puedes actualizar tus datos desde tu perfil y pedirnos la eliminación de tu cuenta escribiendo a soporte.
          No vendemos tus datos a terceros.
        </p>
      </section>
    </LegalLayout>
  )
}

export function ContactoPage() {
  const { data: s } = useSettings()
  const wa = s?.whatsappSoporte ? whatsappUrl(s.whatsappSoporte, "Hola, necesito ayuda con GanadoMarket.") : null
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Contacto y ayuda</h1>
      <p className="mt-1 text-sm text-muted-foreground">Escríbenos y te respondemos lo antes posible.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/50">
            <MessageCircle className="size-6 text-[#25D366]" />
            <div>
              <p className="font-medium">WhatsApp de soporte</p>
              <p className="text-sm text-muted-foreground">+{s?.whatsappSoporte}</p>
            </div>
          </a>
        )}
        {s?.emailSoporte && (
          <a href={`mailto:${s.emailSoporte}`} className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/50">
            <Mail className="size-6 text-primary" />
            <div>
              <p className="font-medium">Correo</p>
              <p className="text-sm text-muted-foreground">{s.emailSoporte}</p>
            </div>
          </a>
        )}
        {!wa && !s?.emailSoporte && (
          <p className="text-sm text-muted-foreground">Los canales de soporte aún no están configurados.</p>
        )}
      </div>

      <h2 className="mt-10 mb-4 text-xl font-semibold">Preguntas frecuentes</h2>
      <div className="divide-y rounded-xl border bg-card">
        {[
          ["¿Cuánto cuesta publicar?", "Publicar anuncios y solicitudes es gratis. No cobramos comisión sobre la venta."],
          ["¿Cuánto tarda en publicarse mi anuncio?", "Revisamos cada anuncio antes de publicarlo, normalmente el mismo día."],
          ["¿Cómo verifican una finca?", "Revisamos el RIF y el hierro registrado que el ganadero carga en su panel. Las fincas verificadas muestran una insignia azul."],
          ["¿Cómo pago el ganado?", "El pago se acuerda directamente con el vendedor. Nunca pagues por adelantado sin ver el animal y sus documentos."],
          ["Olvidé mi contraseña", "Usa “¿Olvidaste tu contraseña?” en la pantalla de ingreso y te enviaremos un enlace a tu correo."],
        ].map(([q, a]) => (
          <details key={q} className="group p-4">
            <summary className="cursor-pointer list-none font-medium marker:hidden">{q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Lee también los <Link to="/terminos" className="text-primary hover:underline">términos de uso</Link> y la{" "}
        <Link to="/privacidad" className="text-primary hover:underline">política de privacidad</Link>.
      </p>
      <Link to="/ganado" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>Volver al marketplace</Link>
    </div>
  )
}
