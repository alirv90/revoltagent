import { defineConfig } from "vite";

import { workerAliases, workerDefine } from "./vite.shared";

export default defineConfig(() => ({
  resolve: {
    alias: workerAliases,
  },
  define: workerDefine,
  worker: {
    format: "es" as const,
  },
  server: {
    port: 5173,
  },
}));
