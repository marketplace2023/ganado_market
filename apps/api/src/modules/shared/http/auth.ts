import { db } from "#database/connection.ts"
import { rolesTable, usersTable, usersToRolesTable } from "#database/schemas/index.ts"
import { env } from "#env.ts"
import type { AuthUser, RoleName } from "@workspace/shared"
import { eq } from "drizzle-orm"
import { createMiddleware } from "hono/factory"
import { sign, verify } from "hono/jwt"
import { forbidden, unauthorized } from "./errors.ts"

export type AppEnv = { Variables: { user: AuthUser } }
export type OptionalUserEnv = { Variables: { user: AuthUser | null } }

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30

export async function signToken(userId: number) {
  return sign(
    { sub: userId, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS },
    env.JWT_SECRET,
    "HS256"
  )
}

/** Carga usuario + roles frescos desde la BD (así un cambio de rol o suspensión aplica de inmediato). */
export async function loadAuthUser(userId: number): Promise<(AuthUser & { status: string }) | null> {
  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      status: usersTable.status,
      role: rolesTable.name,
    })
    .from(usersTable)
    .leftJoin(usersToRolesTable, eq(usersToRolesTable.userId, usersTable.id))
    .leftJoin(rolesTable, eq(rolesTable.id, usersToRolesTable.roleId))
    .where(eq(usersTable.id, userId))

  if (!rows.length) return null
  const { role: _role, ...user } = rows[0]
  return { ...user, roles: rows.map((r) => r.role).filter((r): r is RoleName => r !== null) }
}

async function userFromHeader(header: string | undefined) {
  if (!header?.startsWith("Bearer ")) return null
  try {
    const payload = await verify(header.slice(7), env.JWT_SECRET, "HS256")
    const user = await loadAuthUser(Number(payload.sub))
    if (!user || user.status !== "activo") return null
    const { status: _status, ...authUser } = user
    return authUser
  } catch {
    return null
  }
}

/** Exige un JWT válido (Authorization: Bearer). */
export const authRequired = createMiddleware<AppEnv>(async (c, next) => {
  const user = await userFromHeader(c.req.header("Authorization"))
  if (!user) throw unauthorized()
  c.set("user", user)
  await next()
})

/** Adjunta el usuario si viene token, sin exigirlo (p. ej. consultas de visitantes). */
export const authOptional = createMiddleware<OptionalUserEnv>(async (c, next) => {
  c.set("user", await userFromHeader(c.req.header("Authorization")))
  await next()
})

/** Debe ir después de authRequired. El admin pasa siempre. */
export const requireRole = (...roles: RoleName[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user")
    if (!user.roles.includes("admin") && !roles.some((r) => user.roles.includes(r))) {
      throw forbidden("No tienes permisos para esta sección")
    }
    await next()
  })
