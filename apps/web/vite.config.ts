import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const API = process.env.VITE_API_PROXY ?? "http://localhost:4000"

// El frontend llama a /api/* y Vite lo reenvía al backend (en producción lo hace Netlify).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: API, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, "") },
      "/uploads": { target: API, changeOrigin: true },
    },
  },
})
