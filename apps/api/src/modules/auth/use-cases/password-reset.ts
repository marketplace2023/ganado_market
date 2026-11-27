import { db } from "#database/connection.ts"
import { passwordResetsTable, usersTable } from "#database/schemas/index.ts"
import { env } from "#env.ts"
import { emailLayout, sendMail } from "#modules/mail/mailer.ts"
import { fieldError } from "#modules/shared/http/errors.ts"
import { hashPassword } from "#modules/shared/lib/utils.ts"
import type { ForgotPasswordDto, ResetPasswordDto } from "@workspace/shared"
import { and, eq, gt, isNull } from "drizzle-orm"
import { createHash, randomBytes } from "node:crypto"

const TTL_MS = 60 * 60 * 1000 // 1 hora
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex")

const APP_URL = { web: env.WEB_URL, ganadero: env.GANADERO_URL, admin: env.ADMIN_URL } as const

/**
 * Genera un token de un solo uso y envía el enlace por correo.
 * Siempre responde igual exista o no el correo, para no revelar qué cuentas existen.
 */
export async function requestPasswordReset(dto: ForgotPasswordDto) {
  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, status: usersTable.status })
    .from(usersTable)
    .where(eq(usersTable.email, dto.email))
  if (!user || user.status !== "activo") return

  const token = randomBytes(32).toString("base64url")
  await db.insert(passwordResetsTable).values({
    userId: user.id,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + TTL_MS),
  })

  const link = `${APP_URL[dto.app]}/restablecer?token=${token}`
  await sendMail({
    to: dto.email,
    subject: "Restablece tu contraseña de GanadoMarket",
    text: `Hola ${user.name}, para crear una nueva contraseña abre este enlace (vence en 1 hora): ${link}\nSi no lo pediste, ignora este correo.`,
    html: emailLayout(
      "Restablece tu contraseña",
      `<p>Hola ${user.name.replace(/[<>&]/g, "")},</p>
       <p>Recibimos una solicitud para cambiar tu contraseña. El enlace vence en 1 hora.</p>
       <p><a href="${link}" style="display:inline-block;background:#1f4d33;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Crear nueva contraseña</a></p>
       <p style="font-size:12px;color:#7a735e">Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>`
    ),
  })
}

export async function resetPassword(dto: ResetPasswordDto) {
  const [reset] = await db
    .select()
    .from(passwordResetsTable)
    .where(
      and(
        eq(passwordResetsTable.tokenHash, sha256(dto.token)),
        isNull(passwordResetsTable.usedAt),
        gt(passwordResetsTable.expiresAt, new Date())
      )
    )
  if (!reset) throw fieldError("token", "El enlace no es válido o ya venció. Solicita uno nuevo.")

  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ password: await hashPassword(dto.password) })
      .where(eq(usersTable.id, reset.userId))
    // Invalida este y cualquier otro enlace pendiente del usuario.
    await tx
      .update(passwordResetsTable)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetsTable.userId, reset.userId), isNull(passwordResetsTable.usedAt)))
  })
}
