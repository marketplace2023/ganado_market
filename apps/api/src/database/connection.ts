import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import { env } from "#env.ts"
import * as schema from "#database/schemas/index.ts"

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_URL.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
})

export const db = drizzle(pool, { schema })
export type Database = typeof db
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
