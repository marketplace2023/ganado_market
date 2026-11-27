/** Tipos de respuesta del API (contrato entre apps/api y los frontends). */
import type {
  CategoriaAnimal,
  ModalidadPrecio,
  Proposito,
  Sexo,
  TipoAnuncio,
  TipoServicio,
} from "./ganado.js"
import type {
  AnuncioStatus,
  ConsultaStatus,
  DenunciaMotivo,
  DenunciaStatus,
  FincaVerificacion,
  RoleName,
  SolicitudStatus,
  SubastaStatus,
  Urgencia,
  UserStatus,
} from "./status.js"

export type Paginated<T> = { items: T[]; total: number; page: number; limit: number }

export type AuthUser = {
  id: number
  name: string
  email: string
  phone: string | null
  roles: RoleName[]
}
export type AuthResponse = { token: string; user: AuthUser }

export type Raza = { id: number; especieId: number; slug: string; name: string; proposito: Proposito | null }
export type Especie = { id: number; slug: string; name: string; icon: string; razas: Raza[] }

export type PublicSettings = {
  tasaBcv: number
  tasaActualizada: string | null
  /** "auto" = ve.dolarapi.com / bcv.org.ve; "manual" = cargada por el admin. */
  tasaFuente: "auto" | "manual"
  whatsappSoporte: string
  emailSoporte: string
}

export type AnuncioCard = {
  id: number
  slug: string
  title: string
  tipo: TipoAnuncio
  sexo: Sexo
  cantidad: number
  categoriaAnimal: CategoriaAnimal | null
  pesoPromedioKg: number | null
  precioUsd: number
  modalidadPrecio: ModalidadPrecio
  negociable: boolean
  estado: string
  municipio: string
  isFeatured: boolean
  guiaMovilizacion: boolean
  especieName: string | null
  especieSlug: string | null
  razaName: string | null
  fincaName: string | null
  fincaSlug: string | null
  fincaVerificada: boolean
  thumbnailUrl: string | null
  publishedAt: string | null
  reservado: boolean
}

export type FincaPublic = {
  id: number
  name: string
  slug: string
  estado: string
  municipio: string
  descripcion: string | null
  hectareas: number | null
  hierro: string | null
  logoUrl: string | null
  coverUrl: string | null
  whatsapp: string
  verificada: boolean
  createdAt: string
}

export type AnuncioDetail = AnuncioCard & {
  status: AnuncioStatus
  description: string
  edadMeses: number | null
  vacunaAftosa: boolean
  vacunaBrucelosis: boolean
  desparasitado: boolean
  registroGenealogico: boolean
  videoUrl: string | null
  viewCount: number
  media: { id: number; url: string }[]
  finca: FincaPublic
  related: AnuncioCard[]
}

/** Anuncio visto por su dueño (panel ganadero) o por un admin. */
export type AnuncioOwned = AnuncioCard & {
  status: AnuncioStatus
  rejectionReason: string | null
  viewCount: number
  whatsappClicks: number
  consultasCount: number
  createdAt: string
  ownerName?: string
  ownerEmail?: string
}

export type ReservaAnuncio = {
  id: number
  cantidad: number
  precioUsd: number
  modalidadPrecio: ModalidadPrecio
  expiresAt: string
  resultado: "liberada" | "vencida" | "vendida" | "retirada" | null
}

export type AnuncioGanadero = AnuncioOwned & { ultimaReserva: ReservaAnuncio | null }

export type AnuncioEditable = {
  id: number
  status: AnuncioStatus
  fincaId: number
  especieId: number
  razaId: number | null
  title: string
  description: string
  tipo: TipoAnuncio
  categoriaAnimal: CategoriaAnimal | null
  sexo: Sexo
  cantidad: number
  edadMeses: number | null
  pesoPromedioKg: number | null
  precioUsd: number
  modalidadPrecio: ModalidadPrecio
  negociable: boolean
  estado: string
  municipio: string
  vacunaAftosa: boolean
  vacunaBrucelosis: boolean
  guiaMovilizacion: boolean
  desparasitado: boolean
  registroGenealogico: boolean
  videoUrl: string | null
  media: string[]
}

export type Finca = FincaPublic & {
  ownerId: number
  direccion: string | null
  rif: string | null
  verificacion: FincaVerificacion
  anunciosCount?: number
  ownerName?: string
  ownerEmail?: string
}

export type Consulta = {
  id: number
  anuncioId: number
  anuncioTitle: string
  anuncioSlug: string
  name: string
  phone: string
  email: string | null
  message: string
  status: ConsultaStatus
  createdAt: string
}

export type SubastaCard = {
  id: number
  slug: string
  title: string
  status: SubastaStatus
  startsAt: string
  endsAt: string
  fincaName: string
  fincaSlug: string
  estado: string
  lotesCount: number
  coverUrl: string | null
}

export type Lote = {
  id: number
  orden: number
  precioBaseUsd: number
  incrementoUsd: number
  mejorPujaUsd: number | null
  pujasCount: number
  /** Monto mínimo aceptado para la siguiente puja. */
  minimoSiguienteUsd: number
  anuncio: AnuncioCard
}

export type SubastaDetail = SubastaCard & {
  description: string
  lotes: Lote[]
}

export type SubastaOwned = SubastaCard & {
  fincaId: number
  description: string
  rawStatus: SubastaStatus
  ownerName?: string
}

export type Servicio = {
  id: number
  tipo: TipoServicio
  name: string
  description: string
  whatsapp: string
  estados: string[]
  verified: boolean
  active: boolean
  /** Sólo en el admin: cuenta vinculada al servicio. */
  userEmail?: string | null
}

export type GanaderoStats = {
  anunciosPublicados: number
  anunciosPendientes: number
  vistas: number
  whatsappClicks: number
  consultasNuevas: number
  subastasActivas: number
}

export type AdminStats = {
  usuarios: number
  ganaderos: number
  fincas: number
  fincasPendientes: number
  anunciosPublicados: number
  anunciosPendientes: number
  subastasPendientes: number
  denunciasPendientes: number
  consultas: number
  porEstado: { estado: string; total: number }[]
  porEspecie: { especie: string; total: number }[]
}

export type AdminUser = {
  id: number
  name: string
  email: string
  phone: string | null
  documentType: string | null
  documentNumber: string | null
  status: UserStatus
  roles: RoleName[]
  createdAt: string
}

export type Solicitud = {
  id: number
  title: string
  description: string
  especieName: string | null
  especieSlug: string | null
  cantidad: number | null
  pesoMinKg: number | null
  pesoMaxKg: number | null
  presupuestoMinUsd: number | null
  presupuestoMaxUsd: number | null
  modalidadPrecio: ModalidadPrecio | null
  estado: string | null
  urgencia: Urgencia
  status: SolicitudStatus
  createdAt: string
  expiresAt: string
  /** Identidad protegida: sólo nombre recortado e iniciales. */
  autorAlias: string
  autorIniciales: string
  contactosCount: number
}

/** Datos de contacto del comprador; sólo los ve un ganadero con sesión iniciada. */
export type SolicitudContacto = { name: string; phone: string | null; email: string }

/** Denuncia vista por el admin. */
export type Denuncia = {
  id: number
  motivo: DenunciaMotivo
  detalle: string
  status: DenunciaStatus
  createdAt: string
  resolvedAt: string | null
  reporterEmail: string | null
  anuncio: {
    id: number
    title: string
    slug: string
    status: AnuncioStatus
    ownerName: string
    ownerEmail: string
  }
  /** Cuántas denuncias pendientes acumula el mismo anuncio. */
  denunciasDelAnuncio: number
}

/** Entrada del historial de acciones del admin. */
export type AuditEntry = {
  id: number
  action: string
  entityType: string
  entityId: number | null
  summary: string
  adminName: string
  adminEmail: string
  createdAt: string
}
