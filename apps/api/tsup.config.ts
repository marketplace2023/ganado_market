import { defineConfig } from "tsup"

// Empaqueta el API en un solo archivo ESM. @workspace/shared se incluye en el bundle
// (es TypeScript fuente), el resto de dependencias se resuelven desde node_modules.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: [/^@workspace\//],
})
