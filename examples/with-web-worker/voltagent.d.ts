// Hand-written type declarations for the bundled `voltagent.mjs` artifact.
// Copied to `dist/voltagent.d.ts` by `pnpm build:lib`.
//
// The runtime is fully bundled into the `.mjs`, but types here re-export
// from the upstream packages. Type-aware consumers must therefore add the
// following to their devDependencies for type resolution only (no runtime
// install needed):
//   - @voltagent/core
//   - @voltagent/supabase
//   - @ai-sdk/anthropic
//   - zod
// JS-only consumers can ignore this file entirely.

export { Agent, Memory, createWorkflowChain } from "@voltagent/core";
export { SupabaseMemoryAdapter } from "@voltagent/supabase";
export { createAnthropic } from "@ai-sdk/anthropic";
export { z } from "zod";

// Mirrors the @voltagent/internal Logger interface so the .d.ts doesn't
// drag a transitive type dep.
export type LogFn = (msg: string, context?: object) => void;

export interface Logger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
  child(bindings: Record<string, unknown>): Logger;
}

export const consoleLogger: Logger;
