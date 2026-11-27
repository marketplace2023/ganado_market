import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatBs, formatDateTime, settingsDto, type PublicSettings } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/dashboard-shell"
import { CheckboxField, FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { RefreshCw } from "lucide-react"
import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { api, useSchemaForm } from "@/lib/api"

export function ConfiguracionPage() {
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => api.get<PublicSettings>("/admin/catalogo/settings") })
  return (
    <>
      <PageHeader title="Configuración" description="Parámetros generales del marketplace." />
      {data ? <SettingsForm settings={data} /> : <Skeleton className="h-72 max-w-lg rounded-xl" />}
    </>
  )
}

const localPhone = (p: string) => (p.startsWith("58") ? `0${p.slice(2)}` : p)

function SettingsForm({ settings }: { settings: PublicSettings }) {
  const qc = useQueryClient()
  const [v, setV] = useState(() => ({
    tasaAuto: settings.tasaFuente === "auto",
    tasaBcv: settings.tasaBcv > 0 ? String(settings.tasaBcv) : "",
    whatsappSoporte: localPhone(settings.whatsappSoporte),
    emailSoporte: settings.emailSoporte,
  }))
  const { errors, validate, onServerError } = useSchemaForm(settingsDto)

  const save = useMutation({
    mutationFn: (dto: object) => api.put<PublicSettings>("/admin/catalogo/settings", dto),
    onSuccess: (s) => {
      toast.success("Configuración guardada")
      qc.setQueryData(["settings"], s)
      if (s.tasaFuente === "auto") setV((x) => ({ ...x, tasaBcv: String(s.tasaBcv) }))
    },
    onError: onServerError,
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const dto = validate({ ...v, tasaBcv: v.tasaAuto ? undefined : v.tasaBcv })
    if (dto) save.mutate(dto)
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-lg space-y-5 rounded-xl border bg-card p-5">
      <div className="space-y-3">
        <p className="text-sm font-medium">Tasa oficial BCV</p>
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-2xl font-semibold tabular-nums">
            {settings.tasaBcv > 0 ? `${formatBs(settings.tasaBcv)}` : "—"}
            <span className="ml-1 text-sm font-normal text-muted-foreground">por USD</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {settings.tasaActualizada ? `Actualizada ${formatDateTime(settings.tasaActualizada)}` : "Sin tasa cargada"} ·{" "}
            {settings.tasaFuente === "auto" ? "automática (ve.dolarapi.com / bcv.org.ve)" : "cargada a mano"}
          </p>
        </div>
        <CheckboxField
          label="Actualizar automáticamente"
          description="El API consulta la tasa oficial cada pocas horas. Desactívalo sólo si necesitas fijarla a mano."
          checked={v.tasaAuto}
          onChange={(c) => setV({ ...v, tasaAuto: c })}
        />
        {!v.tasaAuto && (
          <FormField label="Tasa manual (Bs. por USD)" error={errors.tasaBcv}>
            <Input type="number" step="any" min={0} value={v.tasaBcv} onChange={(e) => setV({ ...v, tasaBcv: e.target.value })} />
          </FormField>
        )}
      </div>
      <FormField label="WhatsApp de soporte" error={errors.whatsappSoporte} hint="Se muestra en el pie y en la página de contacto">
        <Input inputMode="tel" value={v.whatsappSoporte} onChange={(e) => setV({ ...v, whatsappSoporte: e.target.value })} placeholder="0414-1234567" />
      </FormField>
      <FormField label="Correo de soporte" error={errors.emailSoporte} hint="Opcional. Usa un dominio propio para generar confianza">
        <Input type="email" value={v.emailSoporte} onChange={(e) => setV({ ...v, emailSoporte: e.target.value })} placeholder="soporte@tudominio.com" />
      </FormField>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? <RefreshCw className="animate-spin" /> : null} Guardar
      </Button>
    </form>
  )
}
