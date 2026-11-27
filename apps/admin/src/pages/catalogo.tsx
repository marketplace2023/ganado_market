import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  PROPOSITOS,
  PROPOSITO_LABEL,
  especieDto,
  razaDto,
  slugify,
  type Especie,
  type Raza,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/dashboard-shell"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { Pencil, Plus, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { api, useEspecies, useSchemaForm } from "@/lib/api"

export function CatalogoPage() {
  const { data } = useEspecies()
  const [nuevaEspecie, setNuevaEspecie] = useState(false)
  const [editEspecie, setEditEspecie] = useState<Especie | null>(null)
  const [editRaza, setEditRaza] = useState<Raza | null>(null)

  return (
    <>
      <PageHeader
        title="Especies y razas"
        description="Taxonomía que usan los filtros del marketplace y el formulario de publicación."
        actions={<Button onClick={() => setNuevaEspecie(true)}><Plus /> Nueva especie</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.map((e) => (
          <EspecieCard key={e.id} especie={e} onEdit={() => setEditEspecie(e)} onEditRaza={setEditRaza} />
        ))}
      </div>
      {(nuevaEspecie || editEspecie) && (
        <EspecieDialog
          especie={editEspecie}
          onClose={() => {
            setNuevaEspecie(false)
            setEditEspecie(null)
          }}
        />
      )}
      {editRaza && <RazaDialog raza={editRaza} onClose={() => setEditRaza(null)} />}
    </>
  )
}

function EspecieCard({
  especie,
  onEdit,
  onEditRaza,
}: {
  especie: Especie
  onEdit: () => void
  onEditRaza: (r: Raza) => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState("")
  const [proposito, setProposito] = useState("")
  const { errors, validate, onServerError } = useSchemaForm(razaDto)
  const refresh = () => qc.invalidateQueries({ queryKey: ["especies"] })

  const add = useMutation({
    mutationFn: (dto: object) => api.post("/admin/catalogo/razas", dto),
    onSuccess: () => {
      setName("")
      toast.success("Raza agregada")
      refresh()
    },
    onError: onServerError,
  })
  const del = useMutation({
    mutationFn: (id: number) => api.del(`/admin/catalogo/razas/${id}`),
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">
          {especie.name} <span className="font-normal text-muted-foreground">· {especie.razas.length} razas</span>
        </p>
        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${especie.name}`} onClick={onEdit}>
          <Pencil />
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {especie.razas.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-0.5 rounded-full bg-secondary py-0.5 pr-1 pl-2.5 text-xs">
            <button type="button" onClick={() => onEditRaza(r)} className="hover:underline" title="Editar raza">
              {r.name}
              {r.proposito && <span className="text-muted-foreground"> · {PROPOSITO_LABEL[r.proposito]}</span>}
            </button>
            <button
              type="button"
              onClick={() => confirm(`¿Eliminar la raza ${r.name}? Los anuncios que la usan quedarán sin raza.`) && del.mutate(r.id)}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-destructive"
              aria-label={`Eliminar ${r.name}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const dto = validate({ especieId: especie.id, name, slug: slugify(name), proposito: proposito || null })
          if (dto) add.mutate(dto)
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva raza" aria-label="Nueva raza" aria-invalid={Boolean(errors.name)} />
        <NativeSelect value={proposito} onChange={(e) => setProposito(e.target.value)} aria-label="Propósito">
          <NativeSelectOption value="">Propósito…</NativeSelectOption>
          {PROPOSITOS.map((p) => <NativeSelectOption key={p} value={p}>{PROPOSITO_LABEL[p]}</NativeSelectOption>)}
        </NativeSelect>
        <Button type="submit" size="icon" aria-label="Agregar raza" disabled={add.isPending}><Plus /></Button>
      </form>
      {(errors.name || errors.slug) && <p className="mt-1 text-xs text-destructive">{errors.name ?? errors.slug}</p>}
    </div>
  )
}

function EspecieDialog({ especie, onClose }: { especie: Especie | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState(especie?.name ?? "")
  const [slug, setSlug] = useState(especie?.slug ?? "")
  const { errors, validate, onServerError } = useSchemaForm(especieDto)
  const save = useMutation({
    mutationFn: (dto: object) =>
      especie ? api.put(`/admin/catalogo/especies/${especie.id}`, dto) : api.post("/admin/catalogo/especies", dto),
    onSuccess: () => {
      toast.success(especie ? "Especie actualizada" : "Especie creada")
      qc.invalidateQueries({ queryKey: ["especies"] })
      onClose()
    },
    onError: onServerError,
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{especie ? `Editar ${especie.name}` : "Nueva especie"}</DialogTitle>
          <DialogDescription>
            El identificador aparece en las URLs del marketplace (ej. /ganado?especie=bovino). Cambiarlo rompe los
            enlaces ya compartidos.
          </DialogDescription>
        </DialogHeader>
        <FormField label="Nombre (plural)" error={errors.name}>
          <Input
            value={name}
            placeholder="Ej. Bovinos"
            onChange={(e) => {
              setName(e.target.value)
              if (!especie) setSlug(slugify(e.target.value))
            }}
          />
        </FormField>
        <FormField label="Identificador" error={errors.slug} hint="Minúsculas, números y guiones">
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button
            disabled={save.isPending}
            onClick={() => {
              const dto = validate({ name, slug, icon: especie?.icon ?? "beef" })
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

function RazaDialog({ raza, onClose }: { raza: Raza; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState(raza.name)
  const [proposito, setProposito] = useState<string>(raza.proposito ?? "")
  const { errors, validate, onServerError } = useSchemaForm(razaDto)
  const save = useMutation({
    mutationFn: (dto: object) => api.put(`/admin/catalogo/razas/${raza.id}`, dto),
    onSuccess: () => {
      toast.success("Raza actualizada")
      qc.invalidateQueries({ queryKey: ["especies"] })
      onClose()
    },
    onError: onServerError,
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar raza</DialogTitle>
        </DialogHeader>
        <FormField label="Nombre" error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Propósito">
          <NativeSelect className="w-full" value={proposito} onChange={(e) => setProposito(e.target.value)}>
            <NativeSelectOption value="">Sin propósito</NativeSelectOption>
            {PROPOSITOS.map((p) => <NativeSelectOption key={p} value={p}>{PROPOSITO_LABEL[p]}</NativeSelectOption>)}
          </NativeSelect>
        </FormField>
        <DialogFooter>
          <Button
            disabled={save.isPending}
            onClick={() => {
              // El identificador se mantiene para no romper filtros ni enlaces existentes.
              const dto = validate({ especieId: raza.especieId, name, slug: raza.slug, proposito: proposito || null })
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
