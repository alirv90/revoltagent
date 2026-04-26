# VoltAgent in a Web Worker

Run a VoltAgent **workflow** with an `andAgent` step and **Supabase memory** entirely inside a browser **Web Worker** — without forking `@voltagent/core`.

The trick is bundler aliases that swap a handful of Node-only modules for worker-safe shims, plus a runtime hint that routes core through its serverless observability path.

## What's in here

```
src/
  main.ts                       # host page; spawns the worker
  worker.ts                     # Agent + workflow + Supabase memory live here
  worker-shims/
    bootstrap.ts                # sets globalThis.EdgeRuntime before core loads
    async-hooks.ts              # @opentelemetry/context-async-hooks → Noop
    node-async-hooks.ts         # node:async_hooks → single-thread polyfill
    node-util.ts                # node:util.isDeepStrictEqual → portable impl
    node-fs-stub.ts             # fs / node:fs → throwing named exports
    node-fs-promises-stub.ts    # fs/promises → throwing named exports
    node-child-process-stub.ts  # child_process → throwing spawn / execSync
    mcp-stdio-stub.ts           # @modelcontextprotocol/sdk stdio transport stub
    empty.ts                    # node:os / node:module / node:crypto / etc.
    path-browser.ts             # node:path → posix subset
    console-logger.ts           # @voltagent/internal Logger over console.*
integration/                    # worker-load + worker-e2e (vitest, happy-dom, aliased)
tests/build-smoke.spec.ts       # programmatic vite build (vitest, no aliases)
index.html
vite.config.ts                  # resolve.alias map
vitest.config.ts                # unit + build-smoke (no aliases)
vitest.integration.config.ts    # integration tests (aliases applied)
.env.test                       # fake env values consumed during tests
```

## Why this is needed

Loading `@voltagent/core` in a stock Web Worker fails because:

1. `agent/agent.ts` statically imports `node:util` (for `isDeepStrictEqual`).
2. `agent.ts` → `workspace/index.ts` transitively imports `node:fs`, `node:child_process`, `node:fs/promises`, `node:path` via the workspace sandbox/filesystem backends.
3. The observability layer always loads `@opentelemetry/context-async-hooks`, which itself imports `node:async_hooks`.
4. Runtime detection in `utils/runtime.ts` doesn't recognise Web Workers, so core picks the Node observability path.
5. `@voltagent/supabase` defaults to a Pino logger, which isn't worker-safe.

The shims replace those imports with worker-safe equivalents. The runtime hint (`globalThis.EdgeRuntime = "WebWorker"`) routes core's `isServerlessRuntime()` through its serverless observability variant. Pino is bypassed by passing a console logger to `SupabaseMemoryAdapter`.

## Required runtime config

In `worker.ts`, two things must happen:

- Set `globalThis.EdgeRuntime = "WebWorker"` **before** `@voltagent/core` evaluates. Because ES module imports are hoisted, the assignment lives in a side-effect-only module (`worker-shims/bootstrap.ts`) imported **first**.
- Construct the `Agent` with `workspaceToolkits: false`. Filesystem/sandbox toolkits cannot run in a worker.

```ts
import "./worker-shims/bootstrap"; // sets globalThis.EdgeRuntime first
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "summarizer",
  model: anthropic("claude-haiku-4-5"),
  memory,
  workspaceToolkits: false, // critical
});
```

## Bundler aliases (Vite)

```ts
resolve: {
  alias: [
    { find: "@opentelemetry/context-async-hooks", replacement: shim("async-hooks.ts") },
    { find: /^node:async_hooks$/, replacement: shim("node-async-hooks.ts") },
    { find: /^node:util$/,        replacement: shim("node-util.ts") },
    { find: /^node:fs$/,          replacement: shim("empty.ts") },
    { find: /^node:fs\/promises$/, replacement: shim("empty.ts") },
    { find: /^node:child_process$/, replacement: shim("empty.ts") },
    { find: /^node:os$/,          replacement: shim("empty.ts") },
    { find: /^node:module$/,      replacement: shim("empty.ts") },
    { find: /^node:stream\/web$/, replacement: shim("empty.ts") },
    { find: /^node:crypto$/,      replacement: shim("empty.ts") },
    { find: /^node:path$/,        replacement: shim("path-browser.ts") },
  ],
}
```

webpack: same idea via `resolve.alias` plus `resolve.fallback`. esbuild: an `onResolve` plugin matching the same specifiers.

## Run it

1. Copy `.env.example` → `.env` and fill:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_KEY=your-anon-or-service-role-key
   VITE_ANTHROPIC_API_KEY=sk-ant-...
   ```

2. Install and start dev server:

   ```bash
   pnpm install
   pnpm dev
   ```

3. Open the printed URL, type a prompt, click submit. The agent runs inside the worker and posts the summary back to the page.

## Use as a library (single-file bundle)

If you only want to drop VoltAgent into your own worker without copying the alias config and shim files, run:

```bash
pnpm build:lib
```

This produces two artifacts:

- `dist/voltagent.mjs` — single self-contained ESM bundle. Every dependency (`@voltagent/core`, `@voltagent/supabase`, `@ai-sdk/anthropic`, `zod`, the OTel pieces, etc.) is inlined. No bundler required on the consumer side.
- `dist/voltagent.d.ts` — hand-written declarations covering the named exports.

Then in your own worker file:

```ts
// my-worker.ts (your project, not this example)
import {
  Agent,
  Memory,
  createWorkflowChain,
  SupabaseMemoryAdapter,
  createAnthropic,
  z,
  consoleLogger,
} from "./voltagent.mjs";

const anthropic = createAnthropic({
  apiKey: "sk-ant-...",
  headers: { "anthropic-dangerous-direct-browser-access": "true" },
});

const memory = new Memory({
  storage: new SupabaseMemoryAdapter({
    supabaseUrl: "https://...",
    supabaseKey: "...",
    logger: consoleLogger.child({ component: "supabase-memory" }),
  }),
});

const agent = new Agent({
  name: "summarizer",
  instructions: "...",
  model: anthropic("claude-haiku-4-5"),
  memory,
  workspaceToolkits: false, // still required — workspace toolkits need Node
});

self.onmessage = async (event) => {
  // your own message protocol — the lib bundle does not impose one
};
```

`bootstrap.ts` runs automatically as a side-effect of the first import, so `globalThis.EdgeRuntime` is set before `@voltagent/core` evaluates. `consoleLogger` is exported as a convenience so you don't have to wire your own logger just to satisfy `SupabaseMemoryAdapter`'s `logger` option.

### TypeScript types

`voltagent.d.ts` re-exports types from the upstream packages. The runtime is bundled, but **types** still resolve through normal module resolution, so type-aware consumers should add the following to their `devDependencies` (no runtime install needed — these are bundled into the `.mjs`):

```
@voltagent/core
@voltagent/supabase
@ai-sdk/anthropic
zod
```

Pin them to the same versions listed in this example's `package.json` to avoid signature drift between the bundled runtime and the typed surface. JS-only consumers can ignore `voltagent.d.ts` entirely.

### Build outputs

| Command          | Output                                  | Purpose                                                                |
| ---------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm build`     | `dist/index.html` + `dist/assets/*.js`  | Demo app (this example).                                               |
| `pnpm build:lib` | `dist/voltagent.mjs` + `dist/voltagent.d.ts` | Reusable library bundle for consumption from another project.       |

Both write into `dist/`. `pnpm build` (Vite HTML build) clears `dist/` first; `pnpm build:lib` uses `emptyOutDir: false`. If you want both, run them in the order: `pnpm build` then `pnpm build:lib` so the lib artifacts land last.

## Verifying it actually runs in the worker

- DevTools → **Sources** → top-level shows your worker chunk; breakpoints inside `worker.ts` only fire while the worker is executing.
- DevTools → **Network**: requests to your Supabase URL and `api.anthropic.com` originate from the worker thread.
- Build (`pnpm build`) must finish without `Module not found: node:*` errors.

## Running the tests

```bash
pnpm test                # unit + build-smoke (~7 s)
pnpm test:watch          # unit watch mode
pnpm test:integration    # worker-load + worker-e2e (~3 s, requires built workspace deps)
```

> **Important:** integration tests require the workspace packages to be built first:
>
> ```bash
> pnpm --filter @voltagent/internal --filter @voltagent/logger \
>      --filter @voltagent/core --filter @voltagent/supabase build
> ```

### Unit suite (no aliases applied to test files)

The shim suite (in `src/worker-shims/__tests__/`) covers each shim:

- `node-util.spec.ts` — cross-checks `isDeepStrictEqual` against the real `node:util.isDeepStrictEqual` for primitives, nested objects, arrays, dates, regexps, and typed arrays.
- `node-async-hooks.spec.ts` — `AsyncLocalStorage` scoping, nested `run()`, `disable()`, `exit()`, and `AsyncResource`.
- `path-browser.spec.ts` — every public function cross-checked against `node:path/posix`.
- `async-hooks.spec.ts` — `AsyncHooksContextManager` satisfies the OTel `ContextManager` interface and integrates with `@opentelemetry/api`'s global context.
- `console-logger.spec.ts` — every level routes to the right `console.*` method, `child()` merges bindings, no Pino dependency.
- `empty.spec.ts` — throwing Proxy throws on real property access, and tolerates `then` / `__esModule` checks so module loaders don't false-trigger.
- `bootstrap.spec.ts` — importing `bootstrap.ts` sets `globalThis.EdgeRuntime`, and uses `??=` so an existing value wins.
- `vite-aliases.spec.ts` — every required Node specifier has an alias entry and every replacement file actually exists.

Tests run in Node via `vitest.config.ts` (which intentionally does **not** extend `vite.config.ts`, so the worker aliases don't replace `node:fs` etc. during testing).

### Build smoke (`tests/build-smoke.spec.ts`)

Runs `vite.build()` programmatically against the example, writes to a temp directory, and verifies:

- Build succeeds without errors.
- A worker chunk is emitted in `assets/`.
- The worker chunk contains the `@voltagent/core` runtime markers (`SupabaseMemoryAdapter`, `Memory`, `Agent`).
- The worker chunk includes our `WorkerNoopContextManager` shim — proof the alias for `@opentelemetry/context-async-hooks` was applied.

This catches the most common regression: a future `@voltagent/core` release adding a top-level `node:*` import that we forgot to alias.

### Integration suite (aliases applied)

Two specs in `integration/`, both running under happy-dom with `vitest.integration.config.ts` (which extends `vite.config.ts` so the worker aliases are active):

- `worker-load.spec.ts` — dynamically imports `src/worker.ts`, verifies it evaluates without throwing and assigns `self.onmessage`. Proves the full module-load path works in a worker-like environment.
- `worker-e2e.spec.ts` — same setup, mocks `globalThis.fetch` for both the Supabase REST endpoints and `api.anthropic.com`, posts a message into `self.onmessage`, and asserts the worker posts a structured reply back. We don't reproduce the Anthropic Messages-API wire format byte-for-byte (ai-sdk ships `MockLanguageModelV2` for that); the test verifies the **plumbing** — that the workflow runs, fetch is reached, and a `{ ok: true | false }` reply makes the round trip.

Confidence the example actually works in a worker:

| Concern                                                  | Evidence                                       |
| -------------------------------------------------------- | ---------------------------------------------- |
| Bundler resolves every Node import                       | `tests/build-smoke.spec.ts`                    |
| Worker module evaluates without throwing                 | `integration/worker-load.spec.ts`              |
| Full pipeline (postMessage → workflow.run → postMessage) | `integration/worker-e2e.spec.ts`               |
| Each shim is correct in isolation                        | 84 unit tests in `src/worker-shims/__tests__/` |

## Caveats

- **Don't ship API keys to the browser in production.** This example exposes the Anthropic key via `VITE_ANTHROPIC_API_KEY` for demonstration. In real apps, proxy LLM calls through a backend or use scoped, short-lived tokens.
- **Anthropic CORS.** Anthropic blocks browser-origin requests by default. The example sets `anthropic-dangerous-direct-browser-access: "true"` on the provider so the worker can reach `api.anthropic.com` directly. Development only — production should proxy through a server.
- **Telemetry context propagation is lossy.** With the worker async-hooks shim, OpenTelemetry context doesn't carry across `await` boundaries — spans appear flat instead of nested. Tracing still works for top-level operations.
- **No workspace toolkits in the worker.** Filesystem, sandbox, search, and skills toolkits all require Node. Calling them inside the worker throws a clear "Node-only module not available in Web Worker" error from `worker-shims/empty.ts`.
- **`isDeepStrictEqual` polyfill** in `node-util.ts` covers JSON-shaped data (primitives, arrays, plain objects, Dates, typed arrays) — sufficient for tool-call argument comparison. It does not cover `Map` / `Set` / cycles.
- **Version drift.** If a future `@voltagent/core` release adds new top-level `node:*` imports, the alias list may need extending. The shimmed `empty.ts` throws a descriptive error, making this self-diagnosing.

## Key files to read first

- `vite.config.ts` — alias wiring
- `src/worker.ts` — the runtime contract: `EdgeRuntime` hint + `workspaceToolkits: false` + console logger for Supabase
- `src/worker-shims/async-hooks.ts` — how the OTel context manager is replaced with a Noop
