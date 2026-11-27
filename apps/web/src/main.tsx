import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@workspace/ui/components/sonner"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes, useLocation } from "react-router"
import { useEffect } from "react"

import "@workspace/ui/globals.css"
import { SiteLayout } from "@/components/site-layout"
import { AuthProvider } from "@/lib/api"
import { AnuncioPage } from "@/pages/anuncio"
import { LoginPage, RecuperarPage, RegistroPage, RestablecerPage } from "@/pages/auth"
import { CatalogoPage } from "@/pages/catalogo"
import { FavoritosPage } from "@/pages/favoritos"
import { FincaPage } from "@/pages/finca"
import { HomePage } from "@/pages/home"
import { ContactoPage, PrivacidadPage, TerminosPage } from "@/pages/legal"
import { NotFoundPage } from "@/pages/not-found"
import { ServiciosPage } from "@/pages/servicios"
import { MisSolicitudesPage, NuevaSolicitudPage, SolicitudesPage } from "@/pages/solicitudes"
import { SubastaPage } from "@/pages/subasta"
import { SubastasPage } from "@/pages/subastas"

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
})

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/ingresar" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route path="/recuperar" element={<RecuperarPage />} />
            <Route path="/restablecer" element={<RestablecerPage />} />
            <Route element={<SiteLayout />}>
              <Route index element={<HomePage />} />
              <Route path="ganado" element={<CatalogoPage />} />
              <Route path="ganado/:slug" element={<AnuncioPage />} />
              <Route path="fincas/:slug" element={<FincaPage />} />
              <Route path="subastas" element={<SubastasPage />} />
              <Route path="subastas/:slug" element={<SubastaPage />} />
              <Route path="servicios" element={<ServiciosPage />} />
              <Route path="favoritos" element={<FavoritosPage />} />
              <Route path="solicitudes" element={<SolicitudesPage />} />
              <Route path="solicitudes/nueva" element={<NuevaSolicitudPage />} />
              <Route path="mis-solicitudes" element={<MisSolicitudesPage />} />
              <Route path="terminos" element={<TerminosPage />} />
              <Route path="privacidad" element={<PrivacidadPage />} />
              <Route path="contacto" element={<ContactoPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
