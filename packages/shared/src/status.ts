/** Roles: los actores del ecosistema ganadero. */
export const ROLES = ["comprador", "ganadero", "transportista", "veterinario", "admin"] as const
export type RoleName = (typeof ROLES)[number]
export const ROLE_LABEL: Record<RoleName, string> = {
  comprador: "Comprador",
  ganadero: "Ganadero / Vendedor",
  transportista: "Transportista",
  veterinario: "Veterinario",
  admin: "Administrador",
}
/** Roles que se pueden elegir al registrarse (admin se asigna desde el panel). */
export const ROLES_REGISTRO = ["comprador", "ganadero"] as const

export const USER_STATUS = ["activo", "suspendido"] as const
export type UserStatus = (typeof USER_STATUS)[number]

/** Ciclo de vida del anuncio: el ganadero lo envía y un admin lo modera. */
export const ANUNCIO_STATUS = [
  "borrador",
  "pendiente",
  "publicado",
  "rechazado",
  "pausado",
  "vendido",
] as const
export type AnuncioStatus = (typeof ANUNCIO_STATUS)[number]
export const ANUNCIO_STATUS_LABEL: Record<AnuncioStatus, string> = {
  borrador: "Borrador",
  pendiente: "En revisión",
  publicado: "Publicado",
  rechazado: "Rechazado",
  pausado: "Pausado",
  vendido: "Vendido",
}

export const FINCA_VERIFICACION = ["pendiente", "verificada", "rechazada"] as const
export type FincaVerificacion = (typeof FINCA_VERIFICACION)[number]
export const FINCA_VERIFICACION_LABEL: Record<FincaVerificacion, string> = {
  pendiente: "Pendiente",
  verificada: "Verificada",
  rechazada: "Rechazada",
}

/**
 * Remates virtuales (referencia: Subastanet / Subastar en Colombia).
 * "programada" y "en_vivo" se distinguen por la fecha: el API calcula el estado efectivo.
 */
export const SUBASTA_STATUS = [
  "borrador",
  "pendiente",
  "programada",
  "en_vivo",
  "finalizada",
  "cancelada",
] as const
export type SubastaStatus = (typeof SUBASTA_STATUS)[number]
export const SUBASTA_STATUS_LABEL: Record<SubastaStatus, string> = {
  borrador: "Borrador",
  pendiente: "En revisión",
  programada: "Programada",
  en_vivo: "En vivo",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
}

/**
 * Solicitudes de compra: el comprador publica lo que busca y los ganaderos lo contactan.
 * Referencia: tuganadovenezuela.com/solicitudes (urgencia + presupuesto + identidad protegida).
 */
export const URGENCIAS = ["urgente", "esta_semana", "este_mes", "sin_apuro"] as const
export type Urgencia = (typeof URGENCIAS)[number]
export const URGENCIA_LABEL: Record<Urgencia, string> = {
  urgente: "Urgente",
  esta_semana: "Esta semana",
  este_mes: "Este mes",
  sin_apuro: "Sin apuro",
}

export const SOLICITUD_STATUS = ["activa", "cerrada"] as const
export type SolicitudStatus = (typeof SOLICITUD_STATUS)[number]
export const SOLICITUD_STATUS_LABEL: Record<SolicitudStatus, string> = {
  activa: "Activa",
  cerrada: "Cerrada",
}
/** Días que una solicitud permanece visible antes de vencer. */
export const SOLICITUD_DIAS_VIGENCIA = 30

/** Denuncias de anuncios hechas por usuarios o visitantes. */
export const DENUNCIA_MOTIVOS = [
  "fraude",
  "fotos_falsas",
  "precio_irreal",
  "ya_vendido",
  "datos_falsos",
  "otro",
] as const
export type DenunciaMotivo = (typeof DENUNCIA_MOTIVOS)[number]
export const DENUNCIA_MOTIVO_LABEL: Record<DenunciaMotivo, string> = {
  fraude: "Posible estafa (piden pago adelantado, no existe el animal)",
  fotos_falsas: "Fotos falsas o tomadas de internet",
  precio_irreal: "Precio irreal o engañoso",
  ya_vendido: "El ganado ya fue vendido",
  datos_falsos: "Datos sanitarios o de raza falsos",
  otro: "Otro motivo",
}
export const DENUNCIA_STATUS = ["pendiente", "atendida", "descartada"] as const
export type DenunciaStatus = (typeof DENUNCIA_STATUS)[number]
export const DENUNCIA_STATUS_LABEL: Record<DenunciaStatus, string> = {
  pendiente: "Pendiente",
  atendida: "Atendida",
  descartada: "Descartada",
}

/** Acciones que quedan en el historial del admin. */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "anuncio.aprobar": "Aprobó un anuncio",
  "anuncio.rechazar": "Rechazó un anuncio",
  "anuncio.destacar": "Cambió el destacado de un anuncio",
  "anuncio.retirar": "Retiró un anuncio por denuncia",
  "finca.verificacion": "Cambió la verificación de una finca",
  "subasta.aprobar": "Aprobó un remate",
  "subasta.cancelar": "Canceló un remate",
  "solicitud.cerrar": "Cerró una solicitud",
  "solicitud.eliminar": "Eliminó una solicitud",
  "usuario.estado": "Cambió el estado de un usuario",
  "usuario.roles": "Cambió los roles de un usuario",
  "usuario.editar": "Editó los datos de un usuario",
  "usuario.eliminar": "Eliminó una cuenta",
  "servicio.crear": "Creó un servicio",
  "servicio.editar": "Editó un servicio",
  "servicio.eliminar": "Eliminó un servicio",
  "especie.crear": "Creó una especie",
  "especie.editar": "Editó una especie",
  "raza.crear": "Creó una raza",
  "raza.editar": "Editó una raza",
  "raza.eliminar": "Eliminó una raza",
  "config.editar": "Cambió la configuración",
  "denuncia.descartar": "Descartó una denuncia",
}

/** Tono visual de cada estado (lo usa StatusBadge en los frontends). */
export type Tone = "green" | "amber" | "red" | "gray" | "blue"
export const STATUS_TONE: Record<string, Tone> = {
  borrador: "gray",
  pendiente: "amber",
  publicado: "green",
  rechazado: "red",
  rechazada: "red",
  pausado: "gray",
  vendido: "blue",
  verificada: "green",
  programada: "blue",
  en_vivo: "green",
  finalizada: "gray",
  cancelada: "red",
  nueva: "amber",
  respondida: "green",
  cerrada: "gray",
  activo: "green",
  suspendido: "red",
  activa: "green",
  atendida: "green",
  descartada: "gray",
  urgente: "red",
  esta_semana: "amber",
  este_mes: "blue",
  sin_apuro: "gray",
}

export const CONSULTA_STATUS = ["nueva", "respondida", "cerrada"] as const
export type ConsultaStatus = (typeof CONSULTA_STATUS)[number]
export const CONSULTA_STATUS_LABEL: Record<ConsultaStatus, string> = {
  nueva: "Nueva",
  respondida: "Respondida",
  cerrada: "Cerrada",
}
