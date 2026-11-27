import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CONSULTA_STATUS,
  CONSULTA_STATUS_LABEL,
  formatDateTime,
  whatsappUrl,
  type Consulta,
  type ConsultaStatus,
} from "@workspace/shared"
import { buttonVariants } from "@workspace/ui/components/button"
import { EmptyState, PageHeader } from "@workspace/ui/components/dashboard-shell"
import { StatusBadge } from "@workspace/ui/components/form-field"
import { NativeSelect, NativeSelectOption } from "@workspace/ui/components/native-select"
import { cn } from "cn"
import { Inbox, Mail, MessageCircle } from "lucide-react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"
import { WEB_URL, api } from "@/lib/api"

export function ConsultasPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get("status") ?? ""
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["consultas", status],
    queryFn: () => api.get<Consulta[]>(`/ganadero/consultas${status ? `?status=${status}` : ""}`),
  })
  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ConsultaStatus }) =>
      api.patch(`/ganadero/consultas/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultas"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <>
      <PageHeader title="Consultas" description="Mensajes de compradores interesados en tus anuncios." />
      <div className="mb-4 inline-flex gap-1 rounded-lg border bg-card p-1">
        {(["", ...CONSULTA_STATUS] as const).map((s) => (
          <button
            key={s || "todas"}
            onClick={() => setParams(s ? { status: s } : {})}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s ? CONSULTA_STATUS_LABEL[s] : "Todas"}
          </button>
        ))}
      </div>
      {isLoading ? null : data?.length ? (
        <div className="space-y-3">
          {data.map((c) => {
            const wa = whatsappUrl(c.phone, `Hola ${c.name}, le escribo por su consulta sobre "${c.anuncioTitle}" en GanadoMarket.`)
            return (
              <div key={c.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Sobre{" "}
                      <a className="text-primary hover:underline" href={`${WEB_URL}/ganado/${c.anuncioSlug}`} target="_blank" rel="noreferrer">
                        {c.anuncioTitle}
                      </a>{" "}
                      · {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={c.status} label={CONSULTA_STATUS_LABEL[c.status]} />
                </div>
                <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-line">{c.message}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => c.status === "nueva" && update.mutate({ id: c.id, status: "respondida" })}
                      className={cn(buttonVariants({ size: "sm" }), "bg-[#25D366] text-white hover:bg-[#1fb857]")}
                    >
                      <MessageCircle /> Responder por WhatsApp
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <Mail /> {c.email}
                    </a>
                  )}
                  <NativeSelect
                    size="sm"
                    className="ml-auto"
                    value={c.status}
                    onChange={(e) => update.mutate({ id: c.id, status: e.target.value as ConsultaStatus })}
                    aria-label="Estado de la consulta"
                  >
                    {CONSULTA_STATUS.map((s) => <NativeSelectOption key={s} value={s}>{CONSULTA_STATUS_LABEL[s]}</NativeSelectOption>)}
                  </NativeSelect>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={Inbox} title="No hay consultas" description="Cuando un comprador te escriba desde un anuncio, aparecerá aquí." />
      )}
    </>
  )
}
