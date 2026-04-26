// Side-effect-only module. Imported FIRST in the worker entry so that by the
// time `@voltagent/core` evaluates, its `isServerlessRuntime()` check sees
// `globalThis.EdgeRuntime` and routes through the serverless observability
// path. See packages/core/src/utils/runtime.ts.
(globalThis as unknown as { EdgeRuntime?: string }).EdgeRuntime ??= "WebWorker";

export {};
