import { env } from "#env.ts"
import { authRequired, type AppEnv } from "#modules/shared/http/auth.ts"
import { badRequest } from "#modules/shared/http/errors.ts"
import { createHash, randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Hono } from "hono"

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])
export const UPLOADS_DIR = join(process.cwd(), "uploads")

const cloudinaryEnabled = () =>
  Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)

/** Subida firmada a Cloudinary vía REST (sin SDK). */
async function uploadToCloudinary(file: File) {
  const timestamp = Math.floor(Date.now() / 1000)
  const folder = "ganado-market"
  const signature = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`)
    .digest("hex")
  const form = new FormData()
  form.append("file", file)
  form.append("api_key", env.CLOUDINARY_API_KEY!)
  form.append("timestamp", String(timestamp))
  form.append("folder", folder)
  form.append("signature", signature)
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  )
  if (!res.ok) throw new Error(`Cloudinary respondió ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { secure_url: string }
  return data.secure_url
}

/** Fallback de desarrollo: guarda en ./uploads y se sirve en /uploads/*. */
async function uploadToDisk(file: File, ext: string) {
  await mkdir(UPLOADS_DIR, { recursive: true })
  const name = `${randomUUID()}.${ext}`
  await writeFile(join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()))
  return `/uploads/${name}`
}

export const mediaRoutes = new Hono<AppEnv>()

mediaRoutes.post("/upload", authRequired, async (c) => {
  const body = await c.req.parseBody()
  const file = body.file
  if (!(file instanceof File)) throw badRequest("Adjunta una imagen en el campo 'file'")
  const ext = ALLOWED.get(file.type)
  if (!ext) throw badRequest("Formato no permitido (usa JPG, PNG o WebP)")
  if (file.size > MAX_BYTES) throw badRequest("La imagen supera 5 MB")

  const url = cloudinaryEnabled() ? await uploadToCloudinary(file) : await uploadToDisk(file, ext)
  return c.json({ url }, 201)
})
