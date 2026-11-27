import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ESTADOS_VENEZUELA,
  MODALIDADES_PRECIO,
  MODALIDAD_PRECIO_LABEL,
  SOLICITUD_DIAS_VIGENCIA,
  SOLICITUD_STATUS_LABEL,
  URGENCIAS,
  URGENCIA_LABEL,
  formatDate,
  solicitudDto,
  toQuery,
  type Paginated,
  type Solicitud,
} from "@workspace/shared"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { EmptyState } from "@workspace/ui/components/dashboard-shell"
import { FormField, StatusBadge } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { SolicitudCard } from "@workspace/ui/components/solicitud-card"
import { Textarea } from "@workspace/ui/components/textarea"
import { ApiError, issuesToFieldErrors } from "@workspace/shared"
import { cn } from "cn"
import { ClipboardList, Megaphone, Plus, RotateCcw, Trash2, X } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { ContactoSolicitud } from "@/components/contacto-solicitud"
import { api, useAuth, useEspecies } from "@/lib/api"

// ─── Listado público ─────────────────────────────────────────────────────────

export function SolicitudesPage() {
  const [params, setParams] = useSearchParams()
  const { data: especies } = useEspecies()
  const especie = params.get("especie") ?? ""
  const estado = params.get("estado") ?? ""
  const urgencia = params.get("urgencia") ?? ""
  const { data, isLoading } = useQuery({
    queryKey: ["solicitudes", especie, estado, urgencia],
    queryFn: () => api.get<Paginated<Solicitud>>(`/solicitudes${toQuery({ especie, estado, urgencia, limit: 50 })}`),
    placeholderData: keepPreviousData,
  })
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Solicitudes de compra</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Compradores que buscan ganado ahora mismo. Si eres ganadero y tienes lo que piden, contáctalos
            directamente.
          </p>
        </div>
        <Link to="/solicitudes/nueva" className={buttonVariants({ size: "lg" })}>
          <Plus /> Publicar lo que busco
        </Link>
      </div>

      <div className="mt-6 mb-6 flex flex-wrap gap-2">
        <NativeSelect value={especie} onChange={(e) => set("especie", e.target.value)} aria-label="Especie">
          <NativeSelectOption value="">Todas las especies</NativeSelectOption>
          {especies?.map((e) => <NativeSelectOption key={e.slug} value={e.slug}>{e.name}</NativeSelectOption>)}
        </NativeSelect>
        <NativeSelect value={estado} onChange={(e) => set("estado", e.target.value)} aria-label="Estado">
          <NativeSelectOption value="">Toda Venezuela</NativeSelectOption>
          {ESTADOS_VENEZUELA.map((e) => <NativeSelectOption key={e.slug} value={e.slug}>{e.name}</NativeSelectOption>)}
        </NativeSelect>
        <NativeSelect value={urgencia} onChange={(e) => set("urgencia", e.target.value)} aria-label="Urgencia">
          <NativeSelectOption value="">Cualquier urgencia</NativeSelectOption>
          {URGENCIAS.map((u) => <NativeSelectOption key={u} value={u}>{URGENCIA_LABEL[u]}</NativeSelectOption>)}
        </NativeSelect>
      </div>

      {isLoading ? null : data?.items.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((s) => (
            <SolicitudCard key={s.id} solicitud={s} action={<ContactoSolicitud solicitud={s} />} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No hay solicitudes con esos filtros"
          description="¿Buscas algo en particular? Publica una solicitud y deja que los ganaderos te encuentren."
          action={<Link to="/solicitudes/nueva" className={buttonVariants()}>Publicar solicitud</Link>}
        />
      )}
    </div>
  )
}

// ─── Publicar solicitud ──────────────────────────────────────────────────────

const EMPTY = {
  especieId: "",
  title: "",
  description: "",
  cantidad: "",
  pesoMinKg: "",
  pesoMaxKg: "",
  presupuestoMinUsd: "",
  presupuestoMaxUsd: "",
  modalidadPrecio: "",
  estado: "",
  urgencia: "esta_semana",
}

export function NuevaSolicitudPage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: especies } = useEspecies()
  const [v, setV] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: (dto: object) => api.post("/solicitudes", dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitudes"] })
      toast.success("¡Solicitud publicada! Los ganaderos podrán contactarte por WhatsApp.")
      navigate("/mis-solicitudes")
    },
    onError: (e) => {
      if (e instanceof ApiError) setErrors(e.fieldErrors())
      toast.error(e.message)
    },
  })

  if (!isLoading && !user) return <Navigate to="/ingresar" state={{ from: "/solicitudes/nueva" }} replace />

  const bind = (k: keyof typeof EMPTY) => ({
    value: v[k],
    onChange: (e: { target: { value: string } }) => {
      setErrors(({ [k]: _drop, ...rest }) => rest)
      setV((x) => ({ ...x, [k]: e.target.value }))
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = solicitudDto.safeParse(v)
    if (!parsed.success) return setErrors(issuesToFieldErrors(parsed.error.issues))
    setErrors({})
    save.mutate(parsed.data)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">¿Qué ganado buscas?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tu solicitud se publica {SOLICITUD_DIAS_VIGENCIA} días. Tu nombre se muestra protegido y sólo los ganaderos
        registrados pueden ver tu WhatsApp.
      </p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-5 rounded-xl border bg-card p-5">
        <FormField label="¿Qué buscas?" required error={errors.title} hint="Ej. “30 becerros mestizos para levante”">
          <Input {...bind("title")} maxLength={120} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Especie" error={errors.especieId}>
            <NativeSelect className="w-full" {...bind("especieId")}>
              <NativeSelectOption value="">Cualquiera</NativeSelectOption>
              {especies?.map((e) => <NativeSelectOption key={e.id} value={e.id}>{e.name}</NativeSelectOption>)}
            </NativeSelect>
          </FormField>
          <FormField label="Cantidad (cabezas)" error={errors.cantidad}>
            <Input type="number" min={1} {...bind("cantidad")} />
          </FormField>
          <FormField label="Peso mínimo (kg)" error={errors.pesoMinKg}>
            <Input type="number" min={0} {...bind("pesoMinKg")} />
          </FormField>
          <FormField label="Peso máximo (kg)" error={errors.pesoMaxKg}>
            <Input type="number" min={0} {...bind("pesoMaxKg")} />
          </FormField>
          <FormField label="Presupuesto desde (USD)" error={errors.presupuestoMinUsd}>
            <Input type="number" min={0} step="any" {...bind("presupuestoMinUsd")} />
          </FormField>
          <FormField label="Presupuesto hasta (USD)" error={errors.presupuestoMaxUsd}>
            <Input type="number" min={0} step="any" {...bind("presupuestoMaxUsd")} />
          </FormField>
          <FormField label="El presupuesto es…" error={errors.modalidadPrecio}>
            <NativeSelect className="w-full" {...bind("modalidadPrecio")}>
              <NativeSelectOption value="">—</NativeSelectOption>
              {MODALIDADES_PRECIO.map((m) => <NativeSelectOption key={m} value={m}>{MODALIDAD_PRECIO_LABEL[m]}</NativeSelectOption>)}
            </NativeSelect>
          </FormField>
          <FormField label="¿Dónde lo necesitas?" error={errors.estado}>
            <NativeSelect className="w-full" {...bind("estado")}>
              <NativeSelectOption value="">Cualquier estado</NativeSelectOption>
              {ESTADOS_VENEZUELA.map((e) => <NativeSelectOption key={e.slug} value={e.slug}>{e.name}</NativeSelectOption>)}
            </NativeSelect>
          </FormField>
        </div>
        <FormField label="Urgencia" required error={errors.urgencia}>
          <div className="flex flex-wrap gap-2">
            {URGENCIAS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setV((x) => ({ ...x, urgencia: u }))}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  v.urgencia === u ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"
                )}
              >
                {URGENCIA_LABEL[u]}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="Detalles" error={errors.description} hint="Raza o cruce preferido, condiciones de entrega, forma de pago…">
          <Textarea rows={3} {...bind("description")} />
        </FormField>
        <Button type="submit" size="lg" className="h-10 w-full" disabled={save.isPending}>
          {save.isPending ? "Publicando…" : "Publicar solicitud"}
        </Button>
      </form>
    </div>
  )
}

// ─── Mis solicitudes ─────────────────────────────────────────────────────────

export function MisSolicitudesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["solicitudes", "mias", user?.id],
    queryFn: () => api.get<Solicitud[]>("/solicitudes/mias"),
    enabled: Boolean(user),
  })
  const act = useMutation({
    mutationFn: ({ id, path }: { id: number; path: "cerrar" | "renovar" | "eliminar" }) =>
      path === "eliminar" ? api.del(`/solicitudes/${id}`) : api.post(`/solicitudes/${id}/${path}`),
    onSuccess: (_d, { path }) => {
      toast.success({ cerrar: "Solicitud cerrada", renovar: "Solicitud renovada por 30 días", eliminar: "Solicitud eliminada" }[path])
      qc.invalidateQueries({ queryKey: ["solicitudes"] })
    },
    onError: (e) => toast.error(e.message),
  })
  if (!authLoading && !user) return <Navigate to="/ingresar" state={{ from: "/mis-solicitudes" }} replace />

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Mis solicitudes</h1>
        <Link to="/solicitudes/nueva" className={buttonVariants()}><Plus /> Nueva</Link>
      </div>
      {isLoading ? null : data?.length ? (
        <div className="space-y-3">
          {data.map((s) => {
            const vencida = s.status === "activa" && new Date(s.expiresAt) < new Date()
            return (
              <div key={s.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={vencida ? "cerrada" : s.status}
                      label={vencida ? "Vencida" : SOLICITUD_STATUS_LABEL[s.status]}
                    />
                    <span className="text-xs text-muted-foreground">
                      {s.status === "activa" && !vencida ? `Vence ${formatDate(s.expiresAt)}` : `Publicada ${formatDate(s.createdAt)}`}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.contactosCount === 0
                      ? "Aún ningún ganadero vio tu contacto"
                      : `${s.contactosCount} ${s.contactosCount === 1 ? "ganadero vio" : "ganaderos vieron"} tu contacto`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {s.status === "activa" && !vencida ? (
                    <Button variant="outline" size="sm" onClick={() => act.mutate({ id: s.id, path: "cerrar" })}>
                      <X /> Ya conseguí
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => act.mutate({ id: s.id, path: "renovar" })}>
                      <RotateCcw /> Renovar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Eliminar"
                    onClick={() => confirm("¿Eliminar esta solicitud?") && act.mutate({ id: s.id, path: "eliminar" })}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Megaphone}
          title="Aún no publicas solicitudes"
          description="Cuéntale a los ganaderos qué buscas y ellos te contactan."
          action={<Link to="/solicitudes/nueva" className={buttonVariants()}>Publicar solicitud</Link>}
        />
      )}
    </div>
  )
}
