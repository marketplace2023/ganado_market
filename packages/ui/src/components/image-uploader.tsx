import * as React from "react"
import { cn } from "cn"
import { ImagePlus, Loader2, Star, X } from "lucide-react"

/**
 * Selector de fotos: sube cada archivo con `upload` y guarda las URLs.
 * La primera foto es la portada del anuncio.
 */
export function ImageUploader({
  value,
  onChange,
  upload,
  max = 10,
  onError,
}: {
  value: string[]
  onChange: (urls: string[]) => void
  upload: (file: File) => Promise<string>
  max?: number
  onError?: (message: string) => void
}) {
  const [busy, setBusy] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const room = max - value.length
    const list = Array.from(files).slice(0, room)
    if (files.length > room) onError?.(`Máximo ${max} fotos por anuncio`)
    setBusy(list.length)
    const urls: string[] = []
    for (const file of list) {
      try {
        urls.push(await upload(file))
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "No se pudo subir la imagen")
      } finally {
        setBusy((b) => b - 1)
      }
    }
    onChange([...value, ...urls])
    if (inputRef.current) inputRef.current.value = ""
  }

  const makeCover = (i: number) => onChange([value[i], ...value.filter((_, j) => j !== i)])
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i))

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {value.map((url, i) => (
        <div
          key={url}
          className={cn(
            "group relative aspect-square overflow-hidden rounded-lg border bg-muted",
            i === 0 && "ring-2 ring-primary"
          )}
        >
          <img src={url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
          {i === 0 && (
            <span className="absolute top-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
              Portada
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 p-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            {i !== 0 && (
              <button
                type="button"
                onClick={() => makeCover(i)}
                className="rounded bg-white/90 p-1 text-foreground"
                title="Usar como portada"
                aria-label="Usar como portada"
              >
                <Star className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              className="rounded bg-white/90 p-1 text-destructive"
              title="Quitar"
              aria-label="Quitar foto"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
      {Array.from({ length: busy }).map((_, i) => (
        <div key={`busy-${i}`} className="flex aspect-square items-center justify-center rounded-lg border bg-muted">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ))}
      {value.length + busy < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <ImagePlus className="size-5" />
          <span className="text-xs">Agregar</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
