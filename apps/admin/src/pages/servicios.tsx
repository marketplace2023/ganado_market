import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ESTADOS_VENEZUELA,
  TIPOS_SERVICIO,
  TIPO_SERVICIO_LABEL,
  estadoName,
  servicioDto,
  type Servicio,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { EmptyState, PageHeader } from "@workspace/ui/components/dashboard-shell"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { CheckboxField, FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "cn"
import { BadgeCheck, Pencil, Plus, Trash2, Truck } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { api, useSchemaForm } from "@/lib/api"

type Draft = {
  id?: number
  tipo: string
  name: string
  description: string
  whatsapp: string
  estados: string[]
  verified: boolean
  active: boolean
  userEmail: string
}
const NEW: Draft = { tipo: "transporte", name: "", description: "", whatsapp: "", estados: [], verified: false, active: true, userEmail: "" }

export function ServiciosPage() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ["admin-servicios"], queryFn: () => api.get<Servicio[]>("/admin/servicios") })
  const del = useMutation({
    mutationFn: (id: number) => api.del(`/admin/servicios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-servicios"] }),
  })

  return (
    <>
      <PageHeader
        title="Servicios del ecosistema"
        description="Transportistas, veterinarios, inseminadores y proveedores que aparecen en el directorio público."
        actions={<Button onClick={() => setDraft(NEW)}><Plus /> Nuevo servicio</Button>}
      />
      {isLoading ? null : data?.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((s) => (
            <div key={s.id} className={cn("rounded-xl border bg-card p-4", !s.active && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1 font-semibold">{s.name}{s.verified && <BadgeCheck className="size-4 text-sky-600" />}</p>
                  <p className="text-xs text-muted-foreground">{TIPO_SERVICIO_LABEL[s.tipo]} · +{s.whatsapp}{!s.active && " · Inactivo"}</p>
                  <p className="text-xs text-muted-foreground">{s.userEmail ? `Cuenta: ${s.userEmail}` : "Sin cuenta vinculada"}</p>
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setDraft({ ...s, userEmail: s.userEmail ?? "" })}><Pencil /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Eliminar" onClick={() => confirm(`¿Eliminar ${s.name}?`) && del.mutate(s.id)}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-sm text-foreground/80">{s.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">{s.estados.map(estadoName).join(", ")}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Truck} title="Aún no hay servicios" action={<Button onClick={() => setDraft(NEW)}>Agregar el primero</Button>} />
      )}
      {draft && <ServicioDialog draft={draft} onClose={() => setDraft(null)} />}
    </>
  )
}

function ServicioDialog({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const qc = useQueryClient()
  const [v, setV] = useState<Draft>({
    ...draft,
    whatsapp: draft.whatsapp.startsWith("58") ? `0${draft.whatsapp.slice(2)}` : draft.whatsapp,
  })
  const { errors, validate, onServerError } = useSchemaForm(servicioDto)
  const save = useMutation({
    mutationFn: (dto: object) => (v.id ? api.put(`/admin/servicios/${v.id}`, dto) : api.post("/admin/servicios", dto)),
    onSuccess: () => {
      toast.success("Servicio guardado")
      qc.invalidateQueries({ queryKey: ["admin-servicios"] })
      onClose()
    },
    onError: onServerError,
  })
  const toggleEstado = (slug: string) =>
    setV((x) => ({ ...x, estados: x.estados.includes(slug) ? x.estados.filter((e) => e !== slug) : [...x.estados, slug] }))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{v.id ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Tipo" error={errors.tipo}>
            <NativeSelect className="w-full" value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>
              {TIPOS_SERVICIO.map((t) => <NativeSelectOption key={t} value={t}>{TIPO_SERVICIO_LABEL[t]}</NativeSelectOption>)}
            </NativeSelect>
          </FormField>
          <FormField label="WhatsApp" error={errors.whatsapp}>
            <Input value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} placeholder="0414-1234567" />
          </FormField>
        </div>
        <FormField
          label="Cuenta vinculada (correo)"
          error={errors.userEmail}
          hint="Opcional. Si es transporte o veterinario, la cuenta recibe ese rol automáticamente."
        >
          <Input type="email" value={v.userEmail} onChange={(e) => setV({ ...v, userEmail: e.target.value })} placeholder="correo@ejemplo.com" />
        </FormField>
        <FormField label="Nombre" error={errors.name}>
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </FormField>
        <FormField label="Descripción" error={errors.description}>
          <Textarea rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </FormField>
        <FormField label="Estados donde presta servicio" error={errors.estados}>
          <div className="flex flex-wrap gap-1.5">
            {ESTADOS_VENEZUELA.map((e) => (
              <button
                key={e.slug}
                type="button"
                onClick={() => toggleEstado(e.slug)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs",
                  v.estados.includes(e.slug) ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"
                )}
              >
                {e.name}
              </button>
            ))}
          </div>
        </FormField>
        <div className="grid gap-2 sm:grid-cols-2">
          <CheckboxField label="Verificado" checked={v.verified} onChange={(c) => setV({ ...v, verified: c })} />
          <CheckboxField label="Activo en el directorio" checked={v.active} onChange={(c) => setV({ ...v, active: c })} />
        </div>
        <DialogFooter>
          <Button
            disabled={save.isPending}
            onClick={() => {
              const { id: _id, ...rest } = v
              const dto = validate(rest)
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
