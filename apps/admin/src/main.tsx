import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@workspace/ui/components/sonner"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router"

import "@workspace/ui/globals.css"
import { AdminLayout } from "@/components/layout"
import { AuthProvider } from "@/lib/api"
import { AnunciosPage } from "@/pages/anuncios"
import { CatalogoPage } from "@/pages/catalogo"
import { DenunciasPage } from "@/pages/denuncias"
import { HistorialPage } from "@/pages/historial"
import { ConfiguracionPage } from "@/pages/configuracion"
import { DashboardPage } from "@/pages/dashboard"
import { FincasPage } from "@/pages/fincas"
import { LoginPage, RecuperarPage, RestablecerPage } from "@/pages/login"
import { ServiciosPage } from "@/pages/servicios"
import { SolicitudesPage } from "@/pages/solicitudes"
import { SubastasPage } from "@/pages/subastas"
import { UsuariosPage } from "@/pages/usuarios"

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 } },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/recuperar" element={<RecuperarPage />} />
            <Route path="/restablecer" element={<RestablecerPage />} />
            <Route element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="anuncios" element={<AnunciosPage />} />
              <Route path="fincas" element={<FincasPage />} />
              <Route path="subastas" element={<SubastasPage />} />
              <Route path="usuarios" element={<UsuariosPage />} />
              <Route path="servicios" element={<ServiciosPage />} />
              <Route path="solicitudes" element={<SolicitudesPage />} />
              <Route path="denuncias" element={<DenunciasPage />} />
              <Route path="historial" element={<HistorialPage />} />
              <Route path="catalogo" element={<CatalogoPage />} />
              <Route path="configuracion" element={<ConfiguracionPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
