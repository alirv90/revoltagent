import { defineConfig } from "vite";

// The demo no longer re-bundles VoltAgent: src/worker.ts imports the
// prebuilt lib at the runtime URL `/voltagent.mjs` (served from public/).
// We mark that URL as external so Rollup leaves the import untouched and
// the browser fetches it as a sibling module at runtime. All worker-shim
// aliases now live with the lib build (see vite.shared.ts).
export default defineConfig(() => ({
  worker: {
    format: "es" as const,
    rollupOptions: {
      external: ["/voltagent.mjs"],
    },
  },
  server: {
    port: 5173,
  },
}));
