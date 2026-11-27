import { env } from "#env.ts"
import nodemailer, { type Transporter } from "nodemailer"

let transporter: Transporter | null = null

function getTransporter() {
  if (!env.SMTP_HOST) return null
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })
  return transporter
}

type Mail = { to: string; subject: string; text: string; html: string }

/** Envía un correo; sin SMTP configurado lo imprime en consola (modo desarrollo). */
export async function sendMail(mail: Mail) {
  const t = getTransporter()
  if (!t) {
    console.log(`\n✉️  [correo sin SMTP] Para: ${mail.to}\n   Asunto: ${mail.subject}\n   ${mail.text}\n`)
    return
  }
  await t.sendMail({ from: env.SMTP_FROM, ...mail })
}

/** Plantilla HTML mínima con la marca. */
export function emailLayout(title: string, body: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f6f5f0;font-family:Arial,sans-serif;color:#2b2618">
  <div style="max-width:520px;margin:24px auto;background:#fff;border:1px solid #e7e3d6;border-radius:12px;overflow:hidden">
    <div style="background:#1f4d33;color:#f5f8ef;padding:16px 24px;font-weight:bold;font-size:18px">GanadoMarket</div>
    <div style="padding:24px"><h1 style="font-size:20px;margin:0 0 12px">${title}</h1>${body}</div>
    <div style="padding:12px 24px;font-size:12px;color:#7a735e;border-top:1px solid #eee">GanadoMarket Venezuela</div>
  </div></body></html>`
}
