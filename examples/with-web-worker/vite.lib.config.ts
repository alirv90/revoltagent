import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

import { workerAliases, workerDefine } from "./vite.shared";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

// Library build: emits a single self-contained ESM bundle at
// dist/voltagent.mjs that re-exports the VoltAgent public API with all
// dependencies inlined and all worker-shim aliases pre-applied. Consumers
// drop the file into their app and import named exports directly from it,
// no bundler required on their side.
export default defineConfig(() => ({
  resolve: {
    alias: workerAliases,
  },
  define: workerDefine,
  build: {
    lib: {
      entry: resolve(projectRoot, "src/lib.ts"),
      formats: ["es" as const],
      fileName: () => "voltagent.mjs",
    },
    outDir: "dist",
    // Coexist with `pnpm build` (the demo) artifacts in dist/. Vite's HTML
    // build clears dist/ on its own, so order of operations matters; the
    // README documents this.
    emptyOutDir: false,
    minify: "esbuild" as const,
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      // Override Vite lib-mode's default behavior of externalizing
      // package.json dependencies. We want everything inlined.
      external: () => false,
      output: {
        // Single-file output even if reachable code uses dynamic import().
        inlineDynamicImports: true,
      },
    },
  },
}));
