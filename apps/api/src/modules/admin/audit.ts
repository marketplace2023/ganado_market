import { db } from "#database/connection.ts"
import { auditLogTable } from "#database/schemas/index.ts"
import type { AuthUser } from "@workspace/shared"

/**
 * Registra una acción del admin en el historial.
 * `action` usa claves de AUDIT_ACTION_LABEL (p. ej. "anuncio.aprobar").
 */
export async function audit(
  admin: AuthUser,
  action: string,
  entityType: string,
  entityId: number | null,
  summary: string
) {
  await db.insert(auditLogTable).values({
    adminId: admin.id,
    adminName: admin.name,
    adminEmail: admin.email,
    action,
    entityType,
    entityId,
    summary: summary.slice(0, 500),
  })
}
