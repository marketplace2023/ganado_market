import { useMutation } from "@tanstack/react-query"
import { DENUNCIA_MOTIVOS, DENUNCIA_MOTIVO_LABEL, type DenunciaMotivo } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "cn"
import { Flag } from "lucide-react"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { toast } from "sonner"
import { api, useAuth } from "@/lib/api"

/** "Denunciar anuncio": exige sesión para evitar denuncias anónimas en masa. */
export function DenunciarAnuncio({ anuncioId, className }: { anuncioId: number; className?: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState<DenunciaMotivo | "">("")
  const [detalle, setDetalle] = useState("")
  const [enviada, setEnviada] = useState(false)

  const enviar = useMutation({
    mutationFn: () => api.post(`/denuncias/anuncio/${anuncioId}`, { motivo, detalle }),
    onSuccess: () => {
      setEnviada(true)
      toast.success("Gracias. El equipo revisará el anuncio.")
      setOpen(false)
    },
    onError: (e) => toast.error(e.message),
  })

  if (enviada) {
    return <p className={cn("text-xs text-muted-foreground", className)}>Denuncia enviada. Gracias por avisarnos.</p>
  }

  return (
    <>
      <button
        type="button"
        className={cn("inline-flex items-center gap-1 text-xs font-medium underline", className)}
        onClick={() => (user ? setOpen(true) : navigate("/ingresar", { state: { from: location.pathname } }))}
      >
        <Flag className="size-3.5" /> Denunciar este anuncio
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Denunciar anuncio</DialogTitle>
            <DialogDescription>Tu denuncia es confidencial: el vendedor no sabrá quién la hizo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2" role="radiogroup" aria-label="Motivo">
            {DENUNCIA_MOTIVOS.map((m) => (
              <label key={m} className="flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm has-checked:border-primary has-checked:bg-primary/5">
                <input type="radio" name="motivo" className="mt-0.5 accent-primary" checked={motivo === m} onChange={() => setMotivo(m)} />
                {DENUNCIA_MOTIVO_LABEL[m]}
              </label>
            ))}
          </div>
          <Textarea
            rows={3}
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Cuéntanos qué pasó (opcional)"
            aria-label="Detalle"
          />
          <DialogFooter>
            <Button variant="destructive" disabled={!motivo || enviar.isPending} onClick={() => enviar.mutate()}>
              Enviar denuncia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
