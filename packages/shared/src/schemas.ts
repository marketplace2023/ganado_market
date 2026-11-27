/**
 * DTOs compartidos: el API los usa para validar y los frontends para tipar y validar formularios.
 */
import { z } from "zod"
import {
  CATEGORIAS_ANIMAL,
  MODALIDADES_PRECIO,
  SEXOS,
  TIPOS_ANUNCIO,
  TIPOS_SERVICIO,
} from "./ganado.js"
import { DENUNCIA_MOTIVOS, ROLES, ROLES_REGISTRO, SOLICITUD_STATUS, URGENCIAS, USER_STATUS } from "./status.js"
import { CEDULA_REGEX, ESTADO_SLUGS, RIF_REGEX, TELEFONO_VE_REGEX } from "./venezuela.js"

// Mensajes de validación en español para API y frontends.
z.config(z.locales.es())

const telefono = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(TELEFONO_VE_REGEX, "Teléfono móvil venezolano inválido (ej. 0414-1234567)"))

const mediaUrl = z.string().trim().min(1).max(500)
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined))

export const estadoSlug = z.enum(ESTADO_SLUGS, { message: "Selecciona un estado" })

/** Convierte issues de zod en { campo: primerMensaje } para mostrar en formularios. */
export function issuesToFieldErrors(issues: z.core.$ZodIssue[]) {
  const errors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path.join(".") || "_"
    errors[key] ??= issue.message
  }
  return errors
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const registerDto = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.email("Correo inválido").toLowerCase(),
    password: z.string().min(8, "Mínimo 8 caracteres").max(255),
    phone: telefono,
    documentType: z.enum(["cedula", "rif"]),
    documentNumber: z.string().trim().toUpperCase(),
    role: z.enum(ROLES_REGISTRO),
  })
  .refine(
    (d) =>
      d.documentType === "cedula"
        ? CEDULA_REGEX.test(d.documentNumber)
        : RIF_REGEX.test(d.documentNumber),
    { message: "Número de documento inválido (ej. V-12345678 o J-12345678-9)", path: ["documentNumber"] }
  )
export type RegisterDto = z.infer<typeof registerDto>

export const forgotPasswordDto = z.object({
  email: z.email("Correo inválido").toLowerCase(),
  /** App desde la que se pidió: define a qué URL apunta el enlace del correo. */
  app: z.enum(["web", "ganadero", "admin"]).default("web"),
})
export type ForgotPasswordDto = z.infer<typeof forgotPasswordDto>

export const resetPasswordDto = z.object({
  token: z.string().min(20),
  password: z.string().min(8, "Mínimo 8 caracteres").max(255),
})
export type ResetPasswordDto = z.infer<typeof resetPasswordDto>

export const loginDto = z.object({
  email: z.email("Correo inválido").toLowerCase(),
  password: z.string().min(1, "Requerido"),
})
export type LoginDto = z.infer<typeof loginDto>

export const updateProfileDto = z.object({
  name: z.string().trim().min(2).max(100),
  phone: telefono,
})
export type UpdateProfileDto = z.infer<typeof updateProfileDto>

// ─── Fincas ──────────────────────────────────────────────────────────────────

export const fincaDto = z.object({
  name: z.string().trim().min(3).max(120),
  estado: estadoSlug,
  municipio: z.string().trim().min(2).max(120),
  direccion: optionalText(255),
  ubicacionPublica: z.object({
    latitud: z.number().min(-85.0511).max(85.0511),
    longitud: z.number().min(-180).max(180),
  }).nullish(),
  hectareas: z.coerce.number().positive().max(1_000_000).optional(),
  descripcion: optionalText(3000),
  whatsapp: telefono,
  rif: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || RIF_REGEX.test(v), "RIF inválido (ej. J-12345678-9)"),
  /** Código del hierro registrado (marca de hierro). */
  hierro: optionalText(60),
  logoUrl: mediaUrl.optional(),
  coverUrl: mediaUrl.optional(),
})
export type FincaDto = z.infer<typeof fincaDto>

// ─── Anuncios ────────────────────────────────────────────────────────────────

export const anuncioDto = z.object({
  fincaId: z.coerce.number().int().positive(),
  especieId: z.coerce.number().int().positive(),
  razaId: z.coerce.number().int().positive().nullable().optional(),
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().max(5000).default(""),
  tipo: z.enum(TIPOS_ANUNCIO),
  categoriaAnimal: z.enum(CATEGORIAS_ANIMAL).nullable().optional(),
  sexo: z.enum(SEXOS),
  cantidad: z.coerce.number().int().min(1).max(100_000),
  edadMeses: z.coerce.number().int().min(0).max(400).nullable().optional(),
  pesoPromedioKg: z.coerce.number().positive().max(2000).nullable().optional(),
  precioUsd: z.coerce.number().positive().max(100_000_000),
  modalidadPrecio: z.enum(MODALIDADES_PRECIO),
  negociable: z.boolean().default(true),
  estado: estadoSlug,
  municipio: z.string().trim().min(2).max(120),
  vacunaAftosa: z.boolean().default(false),
  vacunaBrucelosis: z.boolean().default(false),
  /** Cuenta con guía de movilización / certificado zoosanitario (INSAI). */
  guiaMovilizacion: z.boolean().default(false),
  desparasitado: z.boolean().default(false),
  registroGenealogico: z.boolean().default(false),
  videoUrl: z.url().optional().or(z.literal("").transform(() => undefined)),
  media: z.array(mediaUrl).max(10, "Máximo 10 fotos").default([]),
})
export type AnuncioDto = z.infer<typeof anuncioDto>
export type AnuncioInput = z.input<typeof anuncioDto>

export const reservaAnuncioDto = z.object({
  solicitudId: z.uuid(),
  precioUsd: z.coerce.number().positive().max(100_000_000).multipleOf(0.01, "Usa hasta dos decimales"),
  modalidadPrecio: z.enum(MODALIDADES_PRECIO),
  expiresAt: z.iso.datetime({ message: "Indica cuándo vence la reserva" }),
})
export type ReservaAnuncioDto = z.infer<typeof reservaAnuncioDto>

export const anunciosQuery = z.object({
  q: z.string().trim().max(100).optional(),
  especie: z.string().optional(),
  raza: z.string().optional(),
  estado: z.string().optional(),
  tipo: z.enum(TIPOS_ANUNCIO).optional(),
  sexo: z.enum(SEXOS).optional(),
  categoria: z.enum(CATEGORIAS_ANIMAL).optional(),
  minPrecio: z.coerce.number().nonnegative().optional(),
  maxPrecio: z.coerce.number().nonnegative().optional(),
  minPeso: z.coerce.number().nonnegative().optional(),
  maxPeso: z.coerce.number().nonnegative().optional(),
  /** Edad en meses (así se negocian mautes y novillos). */
  minEdad: z.coerce.number().int().nonnegative().optional(),
  maxEdad: z.coerce.number().int().nonnegative().optional(),
  finca: z.string().optional(),
  orden: z.enum(["recientes", "precio_asc", "precio_desc", "destacados"]).default("destacados"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
})
export type AnunciosQuery = z.infer<typeof anunciosQuery>

export const consultaDto = z.object({
  name: z.string().trim().min(2).max(100),
  phone: telefono,
  email: z.email().optional().or(z.literal("").transform(() => undefined)),
  message: z.string().trim().min(5).max(2000),
})
export type ConsultaDto = z.infer<typeof consultaDto>

export const rejectDto = z.object({ reason: z.string().trim().min(5).max(500) })
export type RejectDto = z.infer<typeof rejectDto>

// ─── Subastas (remates virtuales) ────────────────────────────────────────────

export const subastaDto = z
  .object({
    fincaId: z.coerce.number().int().positive(),
    title: z.string().trim().min(5).max(150),
    description: z.string().trim().max(5000).default(""),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: "El cierre debe ser posterior al inicio",
    path: ["endsAt"],
  })
export type SubastaDto = z.infer<typeof subastaDto>

export const loteDto = z.object({
  anuncioId: z.coerce.number().int().positive(),
  precioBaseUsd: z.coerce.number().positive(),
  incrementoUsd: z.coerce.number().positive().default(10),
})
export type LoteDto = z.infer<typeof loteDto>

export const pujaDto = z.object({ montoUsd: z.coerce.number().positive() })
export type PujaDto = z.infer<typeof pujaDto>

// ─── Servicios del ecosistema (transporte, veterinarios…) ────────────────────

export const servicioDto = z.object({
  tipo: z.enum(TIPOS_SERVICIO),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).default(""),
  whatsapp: telefono,
  estados: z.array(estadoSlug).min(1, "Selecciona al menos un estado"),
  verified: z.boolean().default(false),
  active: z.boolean().default(true),
  /** Correo de la cuenta del transportista/veterinario dueño del servicio (opcional). */
  userEmail: z.email("Correo inválido").toLowerCase().optional().or(z.literal("").transform(() => undefined)),
})
export type ServicioDto = z.infer<typeof servicioDto>

// ─── Denuncias de anuncios ───────────────────────────────────────────────────

export const denunciaDto = z.object({
  motivo: z.enum(DENUNCIA_MOTIVOS, { message: "Elige un motivo" }),
  detalle: z.string().trim().max(1000).default(""),
})
export type DenunciaDto = z.infer<typeof denunciaDto>

// ─── Admin ───────────────────────────────────────────────────────────────────

export const userStatusDto = z.object({ status: z.enum(USER_STATUS) })
export const userRolesDto = z.object({ roles: z.array(z.enum(ROLES)).min(1) })

/** Edición de datos de un usuario por el admin. */
export const adminUserUpdateDto = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.email("Correo inválido").toLowerCase(),
    phone: telefono.optional().or(z.literal("").transform(() => undefined)),
    documentType: z.enum(["cedula", "rif"]).optional(),
    documentNumber: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .refine(
    (d) =>
      !d.documentNumber ||
      (d.documentType === "rif" ? RIF_REGEX.test(d.documentNumber) : CEDULA_REGEX.test(d.documentNumber)),
    { message: "Número de documento inválido (ej. V-12345678 o J-12345678-9)", path: ["documentNumber"] }
  )
export type AdminUserUpdateDto = z.infer<typeof adminUserUpdateDto>

export const especieDto = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/),
  icon: z.string().trim().max(30).default("beef"),
})
export const razaDto = z.object({
  especieId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  proposito: z.enum(["carne", "leche", "doble_proposito", "trabajo", "cria"]).nullable().optional(),
})

export const settingsDto = z
  .object({
    /** true: la tasa BCV se actualiza sola (ve.dolarapi.com, con respaldo en bcv.org.ve). */
    tasaAuto: z.boolean().default(true),
    /** Tasa manual (Bs. por USD); se usa sólo si tasaAuto es false. */
    tasaBcv: z.coerce.number().positive().optional(),
    whatsappSoporte: telefono,
    emailSoporte: z.email("Correo inválido").optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((d) => d.tasaAuto || (d.tasaBcv ?? 0) > 0, {
    message: "Indica la tasa o activa la actualización automática",
    path: ["tasaBcv"],
  })
export type SettingsDto = z.infer<typeof settingsDto>

// ─── Solicitudes de compra ───────────────────────────────────────────────────

const optionalPositive = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.coerce.number().positive().optional()
)

export const solicitudDto = z
  .object({
    especieId: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().positive().nullable().optional()),
    title: z.string().trim().min(5, "Describe brevemente qué buscas").max(120),
    description: z.string().trim().max(1000).default(""),
    cantidad: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(1).max(100_000).optional()),
    pesoMinKg: optionalPositive,
    pesoMaxKg: optionalPositive,
    presupuestoMinUsd: optionalPositive,
    presupuestoMaxUsd: optionalPositive,
    modalidadPrecio: z.preprocess((v) => (v === "" ? undefined : v), z.enum(MODALIDADES_PRECIO).optional()),
    estado: z.preprocess((v) => (v === "" ? undefined : v), estadoSlug.optional()),
    urgencia: z.enum(URGENCIAS),
  })
  .refine((d) => !d.pesoMinKg || !d.pesoMaxKg || d.pesoMaxKg >= d.pesoMinKg, {
    message: "El peso máximo debe ser mayor al mínimo",
    path: ["pesoMaxKg"],
  })
  .refine((d) => !d.presupuestoMinUsd || !d.presupuestoMaxUsd || d.presupuestoMaxUsd >= d.presupuestoMinUsd, {
    message: "El presupuesto máximo debe ser mayor al mínimo",
    path: ["presupuestoMaxUsd"],
  })
export type SolicitudDto = z.infer<typeof solicitudDto>

export const solicitudesQuery = z.object({
  especie: z.string().optional(),
  estado: z.string().optional(),
  urgencia: z.enum(URGENCIAS).optional(),
  status: z.enum(SOLICITUD_STATUS).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
