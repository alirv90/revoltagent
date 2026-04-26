import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

const resolvedViteConfig =
  typeof viteConfig === "function" ? viteConfig({ command: "serve", mode: "test" }) : viteConfig;

// Integration tests: load the worker module through the actual Vite alias
// pipeline. Slow, requires `pnpm --filter @voltagent/* build` first.
export default mergeConfig(
  resolvedViteConfig,
  defineConfig({
    test: {
      environment: "happy-dom",
      include: ["integration/**/*.spec.ts"],
      testTimeout: 60_000,
      hookTimeout: 120_000,
      // Surface fake env values so worker.ts can construct the Supabase
      // adapter without complaining about missing URL/key. Real fetch is
      // mocked in worker-e2e.spec.ts.
      env: {
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_KEY: "anon-key",
        VITE_ANTHROPIC_API_KEY: "sk-ant-test",
      },
    },
  }),
);
