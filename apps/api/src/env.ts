import "dotenv/config"
import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://localhost:5174,http://localhost:5175")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),
  ADMIN_EMAIL: z.email().default("admin@ganadomarket.local"),
  ADMIN_PASSWORD: z.string().min(8).default("Admin1234!"),
  /** URLs públicas de cada app (para los enlaces de los correos). */
  WEB_URL: z.url().default("http://localhost:5173"),
  GANADERO_URL: z.url().default("http://localhost:5174"),
  ADMIN_URL: z.url().default("http://localhost:5175"),
  /** SMTP opcional: sin SMTP_HOST los correos se imprimen en la consola (desarrollo). */
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("GanadoMarket <no-responder@ganadomarket.local>"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("Variables de entorno inválidas:")
  console.error(z.flattenError(parsed.error).fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
