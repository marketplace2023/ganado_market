import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ROLES,
  ROLE_LABEL,
  adminUserUpdateDto,
  formatDate,
  toQuery,
  type AdminUser,
  type Paginated,
  type RoleName,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/dashboard-shell"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { CheckboxField, FormField, StatusBadge } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { ChevronLeft, ChevronRight, Pencil, ShieldCheck, Trash2 } from "lucide-react"
import { useState } from "react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { api, useAuth, useSchemaForm } from "@/lib/api"

export function UsuariosPage() {
  const { user: me } = useAuth()
  const [params, setParams] = useSearchParams()
  const q = params.get("q") ?? ""
  const role = params.get("role") ?? ""
  const page = Number(params.get("page") ?? 1)
  const qc = useQueryClient()
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [editingData, setEditingData] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState<AdminUser | null>(null)

  const { data } = useQuery({
    queryKey: ["admin-usuarios", q, role, page],
    queryFn: () => api.get<Paginated<AdminUser>>(`/admin/usuarios${toQuery({ q, role, page })}`),
    placeholderData: keepPreviousData,
  })
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    if (k !== "page") next.delete("page")
    setParams(next)
  }
  const status = useMutation({
    mutationFn: (u: AdminUser) =>
      api.patch(`/admin/usuarios/${u.id}/status`, { status: u.status === "activo" ? "suspendido" : "activo" }),
    onSuccess: () => {
      toast.success("Estado actualizado")
      qc.invalidateQueries({ queryKey: ["admin-usuarios"] })
    },
    onError: (e) => toast.error(e.message),
  })
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <>
      <PageHeader title="Usuarios" description="Compradores, ganaderos y demás actores del ecosistema." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          key={q}
          defaultValue={q}
          placeholder="Nombre, correo o cédula/RIF…"
          className="h-9 sm:max-w-xs"
          onKeyDown={(e) => e.key === "Enter" && set("q", e.currentTarget.value)}
        />
        <NativeSelect value={role} onChange={(e) => set("role", e.target.value)} aria-label="Rol">
          <NativeSelectOption value="">Todos los roles</NativeSelectOption>
          {ROLES.map((r) => <NativeSelectOption key={r} value={r}>{ROLE_LABEL[r]}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Usuario</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Documento</th>
              <th className="px-4 py-2.5 font-medium">Roles</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.items.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}{u.phone && ` · +${u.phone}`} · desde {formatDate(u.createdAt)}</p>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">{u.documentNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => <span key={r} className="rounded bg-secondary px-1.5 py-0.5 text-xs">{ROLE_LABEL[r]}</span>)}
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={u.status} label={u.status === "activo" ? "Activo" : "Suspendido"} /></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => setEditingData(u)}><Pencil /> Editar</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(u)}><ShieldCheck /> Roles</Button>
                  {u.id !== me?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={u.status === "activo" ? "text-destructive" : ""}
                      onClick={() => status.mutate(u)}
                    >
                      {u.status === "activo" ? "Suspender" : "Reactivar"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => set("page", String(page - 1))}><ChevronLeft /></Button>
          {page} / {totalPages}
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => set("page", String(page + 1))}><ChevronRight /></Button>
        </div>
      )}
      <RolesDialog user={editing} onClose={() => setEditing(null)} />
      {editingData && (
        <EditUserDialog
          user={editingData}
          onClose={() => setEditingData(null)}
          onDelete={() => {
            setDeleting(editingData)
            setEditingData(null)
          }}
          canDelete={editingData.id !== me?.id}
        />
      )}
      {deleting && <DeleteUserDialog user={deleting} onClose={() => setDeleting(null)} />}
    </>
  )
}

const localPhone = (p: string | null) => (p?.startsWith("58") ? `0${p.slice(2)}` : (p ?? ""))

function EditUserDialog({
  user,
  onClose,
  onDelete,
  canDelete,
}: {
  user: AdminUser
  onClose: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const qc = useQueryClient()
  const [v, setV] = useState({
    name: user.name,
    email: user.email,
    phone: localPhone(user.phone),
    documentType: user.documentType ?? "cedula",
    documentNumber: user.documentNumber ?? "",
  })
  const { errors, validate, onServerError } = useSchemaForm(adminUserUpdateDto)
  const save = useMutation({
    mutationFn: (dto: object) => api.put(`/admin/usuarios/${user.id}`, dto),
    onSuccess: () => {
      toast.success("Datos actualizados")
      qc.invalidateQueries({ queryKey: ["admin-usuarios"] })
      onClose()
    },
    onError: onServerError,
  })
  const bind = (k: keyof typeof v) => ({
    value: v[k],
    onChange: (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value })),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>Los cambios de correo afectan cómo ingresa a su cuenta.</DialogDescription>
        </DialogHeader>
        <FormField label="Nombre" error={errors.name}>
          <Input {...bind("name")} />
        </FormField>
        <FormField label="Correo" error={errors.email}>
          <Input type="email" {...bind("email")} />
        </FormField>
        <FormField label="Teléfono / WhatsApp" error={errors.phone}>
          <Input inputMode="tel" placeholder="0414-1234567" {...bind("phone")} />
        </FormField>
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <FormField label="Documento">
            <NativeSelect className="w-full" {...bind("documentType")}>
              <NativeSelectOption value="cedula">Cédula</NativeSelectOption>
              <NativeSelectOption value="rif">RIF</NativeSelectOption>
            </NativeSelect>
          </FormField>
          <FormField label="Número" error={errors.documentNumber}>
            <Input {...bind("documentNumber")} />
          </FormField>
        </div>
        <DialogFooter className="sm:justify-between">
          {canDelete ? (
            <Button variant="ghost" className="text-destructive" onClick={onDelete}>
              <Trash2 /> Eliminar cuenta
            </Button>
          ) : (
            <span />
          )}
          <Button
            disabled={save.isPending}
            onClick={() => {
              const dto = validate(v)
              if (dto) save.mutate(dto)
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Eliminar es irreversible: se pide escribir el correo para confirmar. */
function DeleteUserDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient()
  const [confirmText, setConfirmText] = useState("")
  const del = useMutation({
    mutationFn: () => api.del(`/admin/usuarios/${user.id}`),
    onSuccess: () => {
      toast.success("Cuenta eliminada")
      qc.invalidateQueries({ queryKey: ["admin-usuarios"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar la cuenta de {user.name}</DialogTitle>
          <DialogDescription>
            Se borrarán también sus fincas, anuncios, remates, solicitudes y pujas. Esta acción no se puede deshacer.
            Si sólo quieres bloquear el acceso, usa “Suspender”.
          </DialogDescription>
        </DialogHeader>
        <FormField label={`Escribe ${user.email} para confirmar`}>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
        </FormField>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={confirmText.trim().toLowerCase() !== user.email || del.isPending}
            onClick={() => del.mutate()}
          >
            Eliminar definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RolesDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [roles, setRoles] = useState<RoleName[]>([])
  const [forUser, setForUser] = useState<number | null>(null)
  if (user && forUser !== user.id) {
    setForUser(user.id)
    setRoles(user.roles)
  }
  const save = useMutation({
    mutationFn: () => api.put(`/admin/usuarios/${user!.id}/roles`, { roles }),
    onSuccess: () => {
      toast.success("Roles actualizados")
      qc.invalidateQueries({ queryKey: ["admin-usuarios"] })
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })
  return (
    <Dialog open={user !== null} onOpenChange={(o) => { if (!o) { onClose(); setForUser(null) } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Roles de {user?.name}</DialogTitle>
          <DialogDescription>Un usuario puede cumplir varios papeles en el ecosistema.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {ROLES.map((r) => (
            <CheckboxField
              key={r}
              label={ROLE_LABEL[r]}
              checked={roles.includes(r)}
              onChange={(c) => setRoles((prev) => (c ? [...prev, r] : prev.filter((x) => x !== r)))}
            />
          ))}
        </div>
        <DialogFooter>
          <Button disabled={!roles.length || save.isPending} onClick={() => save.mutate()}>Guardar roles</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
