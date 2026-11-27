import { useMutation } from "@tanstack/react-query"
import { ROLE_LABEL, updateProfileDto, type AuthUser } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/dashboard-shell"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { api, useAuth } from "@/lib/api"
import { useSchemaForm } from "@/lib/form"

export function PerfilPage() {
  const { user, setUser } = useAuth()
  const [v, setV] = useState({
    name: user?.name ?? "",
    phone: user?.phone?.startsWith("58") ? `0${user.phone.slice(2)}` : (user?.phone ?? ""),
  })
  const { errors, validate, onServerError } = useSchemaForm(updateProfileDto)
  const save = useMutation({
    mutationFn: (dto: object) => api.put<AuthUser>("/auth/me", dto),
    onSuccess: (u) => {
      setUser(u)
      toast.success("Perfil actualizado")
    },
    onError: onServerError,
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const dto = validate(v)
    if (dto) save.mutate(dto)
  }

  return (
    <>
      <PageHeader title="Mi perfil" description={`${user?.email} · ${user?.roles.map((r) => ROLE_LABEL[r]).join(", ")}`} />
      <form onSubmit={submit} noValidate className="max-w-lg space-y-4 rounded-xl border bg-card p-5">
        <FormField label="Nombre y apellido" error={errors.name}>
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </FormField>
        <FormField label="Teléfono / WhatsApp" error={errors.phone}>
          <Input inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </FormField>
        <Button type="submit" disabled={save.isPending}>Guardar</Button>
      </form>
    </>
  )
}
