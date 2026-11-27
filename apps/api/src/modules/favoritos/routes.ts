import { db } from "#database/connection.ts"
import { anunciosTable, favoritosTable } from "#database/schemas/index.ts"
import { anuncioCardQuery } from "#modules/anuncios/queries.ts"
import { authRequired, type AppEnv } from "#modules/shared/http/auth.ts"
import { paramId } from "#modules/shared/lib/utils.ts"
import { and, desc, eq } from "drizzle-orm"
import { Hono } from "hono"

/** Favoritos del comprador: /favoritos */
export const favoritosRoutes = new Hono<AppEnv>()
favoritosRoutes.use(authRequired)

favoritosRoutes.get("/", async (c) => {
  const items = await anuncioCardQuery()
    .innerJoin(favoritosTable, eq(favoritosTable.anuncioId, anunciosTable.id))
    .where(eq(favoritosTable.userId, c.get("user").id))
    .orderBy(desc(favoritosTable.createdAt))
  return c.json(items)
})

favoritosRoutes.get("/ids", async (c) => {
  const rows = await db
    .select({ id: favoritosTable.anuncioId })
    .from(favoritosTable)
    .where(eq(favoritosTable.userId, c.get("user").id))
  return c.json(rows.map((r) => r.id))
})

favoritosRoutes.post("/:anuncioId", async (c) => {
  await db
    .insert(favoritosTable)
    .values({ userId: c.get("user").id, anuncioId: paramId(c.req.param("anuncioId")) })
    .onConflictDoNothing()
  return c.body(null, 204)
})

favoritosRoutes.delete("/:anuncioId", async (c) => {
  await db
    .delete(favoritosTable)
    .where(
      and(
        eq(favoritosTable.userId, c.get("user").id),
        eq(favoritosTable.anuncioId, paramId(c.req.param("anuncioId")))
      )
    )
  return c.body(null, 204)
})
