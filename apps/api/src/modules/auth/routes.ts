import { db } from "#database/connection.ts"
import { rolesTable, usersTable, usersToRolesTable } from "#database/schemas/index.ts"
import { fieldError, forbidden, notFound } from "#modules/shared/http/errors.ts"
import { authRequired, loadAuthUser, signToken, type AppEnv } from "#modules/shared/http/auth.ts"
import { validate } from "#modules/shared/http/validator.ts"
import { checkPassword, hashPassword } from "#modules/shared/lib/utils.ts"
import {
  forgotPasswordDto,
  loginDto,
  normalizarTelefono,
  registerDto,
  resetPasswordDto,
  updateProfileDto,
  type AuthResponse,
} from "@workspace/shared"
import { requestPasswordReset, resetPassword } from "./use-cases/password-reset.ts"
import { eq, or } from "drizzle-orm"
import { Hono } from "hono"

export const authRoutes = new Hono<AppEnv>()

/** Registro de comprador o ganadero. */
authRoutes.post("/register", validate("json", registerDto), async (c) => {
  const dto = c.req.valid("json")

  const existing = await db
    .select({ email: usersTable.email, documentNumber: usersTable.documentNumber })
    .from(usersTable)
    .where(or(eq(usersTable.email, dto.email), eq(usersTable.documentNumber, dto.documentNumber)))
  if (existing.some((u) => u.email === dto.email)) {
    throw fieldError("email", "El correo ya está registrado")
  }
  if (existing.length) {
    throw fieldError("documentNumber", "Este documento ya está registrado")
  }

  const userId = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(usersTable)
      .values({
        name: dto.name,
        email: dto.email,
        password: await hashPassword(dto.password),
        phone: normalizarTelefono(dto.phone),
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
      })
      .returning({ id: usersTable.id })

    const roleNames = dto.role === "ganadero" ? (["ganadero", "comprador"] as const) : (["comprador"] as const)
    const roles = await tx.select().from(rolesTable)
    const toAssign = roles.filter((r) => (roleNames as readonly string[]).includes(r.name))
    if (toAssign.length !== roleNames.length) {
      throw new Error("Roles no sembrados. Ejecuta `npm run db:seed`.")
    }
    await tx
      .insert(usersToRolesTable)
      .values(toAssign.map((r) => ({ userId: user.id, roleId: r.id })))
    return user.id
  })

  const user = (await loadAuthUser(userId))!
  const { status: _s, ...authUser } = user
  return c.json({ token: await signToken(userId), user: authUser } satisfies AuthResponse, 201)
})

authRoutes.post("/login", validate("json", loginDto), async (c) => {
  const dto = c.req.valid("json")
  const [row] = await db
    .select({ id: usersTable.id, password: usersTable.password, status: usersTable.status })
    .from(usersTable)
    .where(eq(usersTable.email, dto.email))
    .limit(1)

  if (!row || !(await checkPassword(dto.password, row.password))) {
    throw fieldError("email", "Correo o contraseña incorrectos")
  }
  if (row.status !== "activo") throw forbidden("Tu cuenta está suspendida. Contacta a soporte.")

  const user = (await loadAuthUser(row.id))!
  const { status: _s, ...authUser } = user
  return c.json({ token: await signToken(row.id), user: authUser } satisfies AuthResponse)
})

authRoutes.post("/forgot-password", validate("json", forgotPasswordDto), async (c) => {
  await requestPasswordReset(c.req.valid("json"))
  return c.body(null, 204)
})

authRoutes.post("/reset-password", validate("json", resetPasswordDto), async (c) => {
  await resetPassword(c.req.valid("json"))
  return c.body(null, 204)
})

authRoutes.get("/me", authRequired, (c) => c.json(c.get("user")))

authRoutes.put("/me", authRequired, validate("json", updateProfileDto), async (c) => {
  const dto = c.req.valid("json")
  const { id } = c.get("user")
  const updated = await db
    .update(usersTable)
    .set({ name: dto.name, phone: normalizarTelefono(dto.phone) })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id })
  if (!updated.length) throw notFound("Usuario no encontrado")
  const { status: _s, ...authUser } = (await loadAuthUser(id))!
  return c.json(authUser)
})
