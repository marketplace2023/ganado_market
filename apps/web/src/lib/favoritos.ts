import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { api, useAuth } from "./api"

export function useFavoritos() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const ids = useQuery({
    queryKey: ["favoritos", "ids", user?.id],
    queryFn: () => api.get<number[]>("/favoritos/ids"),
    enabled: Boolean(user),
  })

  const toggle = useMutation({
    mutationFn: async (anuncioId: number) => {
      const isFav = ids.data?.includes(anuncioId)
      if (isFav) await api.del(`/favoritos/${anuncioId}`)
      else await api.post(`/favoritos/${anuncioId}`)
      return !isFav
    },
    onSuccess: (added) => {
      qc.invalidateQueries({ queryKey: ["favoritos"] })
      toast.success(added ? "Guardado en favoritos" : "Quitado de favoritos")
    },
  })

  return {
    isFavorito: (id: number) => Boolean(ids.data?.includes(id)),
    toggle: (id: number) => {
      if (!user) {
        navigate("/ingresar", { state: { from: window.location.pathname } })
        return
      }
      toggle.mutate(id)
    },
  }
}
