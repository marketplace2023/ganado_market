import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@workspace/ui/components/sonner"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router"

import "@workspace/ui/globals.css"
import { PanelLayout } from "@/components/layout"
import { AuthProvider } from "@/lib/api"
import { AnuncioEditorPage } from "@/pages/anuncio-editor"
import { AnunciosPage } from "@/pages/anuncios"
import { LoginPage, RecuperarPage, RegistroPage, RestablecerPage } from "@/pages/auth"
import { ConsultasPage } from "@/pages/consultas"
import { SolicitudesPage } from "@/pages/solicitudes"
import { DashboardPage } from "@/pages/dashboard"
import { FincaFormPage, FincasPage } from "@/pages/fincas"
import { PerfilPage } from "@/pages/perfil"
import { SubastaEditorPage, SubastasPage } from "@/pages/subastas"

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 } },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route path="/recuperar" element={<RecuperarPage />} />
            <Route path="/restablecer" element={<RestablecerPage />} />
            <Route element={<PanelLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="fincas" element={<FincasPage />} />
              <Route path="fincas/nueva" element={<FincaFormPage />} />
              <Route path="fincas/:id" element={<FincaFormPage />} />
              <Route path="anuncios" element={<AnunciosPage />} />
              <Route path="anuncios/nuevo" element={<AnuncioEditorPage />} />
              <Route path="anuncios/:id" element={<AnuncioEditorPage />} />
              <Route path="consultas" element={<ConsultasPage />} />
              <Route path="solicitudes" element={<SolicitudesPage />} />
              <Route path="subastas" element={<SubastasPage />} />
              <Route path="subastas/nueva" element={<SubastaEditorPage />} />
              <Route path="subastas/:id" element={<SubastaEditorPage />} />
              <Route path="perfil" element={<PerfilPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
