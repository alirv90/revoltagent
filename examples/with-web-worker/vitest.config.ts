import { defineConfig } from "vitest/config";

// Tests run in Node and must use real node:* modules. Do NOT extend
// vite.config.ts — the worker aliases there would replace `node:fs` etc.
// with throwing stubs and break the test environment.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "tests/**/*.spec.ts"],
    testTimeout: 180_000,
  },
});
