# VoltAgent in a Web Worker

Run a VoltAgent **workflow** with an `andAgent` step and **Supabase memory** entirely inside a browser **Web Worker** — without forking `@voltagent/core`.

The runtime trick is a separate **library build** (`pnpm build:lib`) that prebundles VoltAgent with worker-safe shims and a serverless-runtime hint into a single `voltagent.mjs` file. The demo's worker imports that file directly via the runtime URL `/voltagent.mjs`; Vite leaves the import alone, so there is no second pass of bundling for VoltAgent inside the demo.

## What's in here

```
src/
  main.ts                       # host page; spawns the worker
  worker.ts                     # message-handler glue; imports lib via /voltagent.mjs
  lib.ts                        # entry for the prebuilt lib bundle
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
public/
  voltagent.mjs                 # populated by `pnpm build:lib`; gitignored
scripts/
  check-lib-built.mjs           # pre-flight check for `dev` and `build`
  postbuild-lib.mjs             # copies lib output into dist/ + public/
tests/
  build-smoke.spec.ts           # programmatic vite build of the demo (no aliases)
  lib-build.spec.ts             # programmatic vite build of the lib
voltagent.d.ts                  # hand-written types shipped next to dist/voltagent.mjs
index.html
vite.config.ts                  # demo build (externalizes /voltagent.mjs)
vite.lib.config.ts              # lib build (single-file ESM with aliases)
vite.shared.ts                  # alias map + define block, shared by lib build
vitest.config.ts                # unit + build smoke (no aliases)
```

## Why this is needed

Loading `@voltagent/core` in a stock Web Worker fails because:

1. `agent/agent.ts` statically imports `node:util` (for `isDeepStrictEqual`).
2. `agent.ts` → `workspace/index.ts` transitively imports `node:fs`, `node:child_process`, `node:fs/promises`, `node:path` via the workspace sandbox/filesystem backends.
3. The observability layer always loads `@opentelemetry/context-async-hooks`, which itself imports `node:async_hooks`.
4. Runtime detection in `utils/runtime.ts` doesn't recognise Web Workers, so core picks the Node observability path.
5. `@voltagent/supabase` defaults to a Pino logger, which isn't worker-safe.

The shims replace those imports with worker-safe equivalents at **lib-build time**. The runtime hint (`globalThis.EdgeRuntime = "WebWorker"`) is set as the bundle's first side effect so it lands before `@voltagent/core` evaluates. Pino is bypassed by passing `consoleLogger` to `SupabaseMemoryAdapter`. None of this leaks into the demo's own Vite config — the demo just consumes the prebuilt bundle.

## Required runtime config

The demo's `worker.ts` is thin. All it does is import from the prebuilt lib and wire up `self.onmessage`:

```ts
import {
  Agent,
  Memory,
  SupabaseMemoryAdapter,
  consoleLogger,
  createAnthropic,
  createWorkflowChain,
  z,
} from "/voltagent.mjs";

const agent = new Agent({
  name: "summarizer",
  model: anthropic("claude-haiku-4-5"),
  memory,
  workspaceToolkits: false, // critical: workspace toolkits need Node
});
```

Two things still matter:

- The `Agent` must be constructed with `workspaceToolkits: false`. Filesystem/sandbox toolkits cannot run in a worker.
- `globalThis.EdgeRuntime = "WebWorker"` must be set before `@voltagent/core` evaluates. This is handled inside the lib bundle (`src/lib.ts` imports `worker-shims/bootstrap` first) — you don't need to do it from `worker.ts`.

## Bundler aliases (in the lib build)

The aliases that swap Node primitives for worker-safe shims live in `vite.shared.ts` and are consumed only by `vite.lib.config.ts`:

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

The demo's `vite.config.ts` does **not** apply these aliases — it just externalizes `/voltagent.mjs` so Rollup leaves the import as-is and the browser fetches the prebuilt bundle at runtime.

webpack: same idea via `resolve.alias` plus `resolve.fallback`. esbuild: an `onResolve` plugin matching the same specifiers.

## Run it

1. Copy `.env.example` → `.env` and fill:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_KEY=your-anon-or-service-role-key
   VITE_ANTHROPIC_API_KEY=sk-ant-...
   ```

2. Install, build the lib, then start the dev server:

   ```bash
   pnpm install
   pnpm build:lib   # required — produces public/voltagent.mjs (and dist/voltagent.mjs)
   pnpm dev
   ```

3. Open the printed URL, type a prompt, click submit. The agent runs inside the worker and posts the summary back to the page.

> `pnpm dev` and `pnpm build` both fail loudly with a clear message if `public/voltagent.mjs` is missing. Re-run `pnpm build:lib` whenever you change `src/lib.ts` or any worker-shim, or when you bump VoltAgent dependencies.

## Use as a library (single-file bundle)

`pnpm build:lib` is also the entry point for using VoltAgent in **your** worker, separately from this example. It produces:

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

| Command          | Output                                                            | Purpose                                                            |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `pnpm build:lib` | `dist/voltagent.mjs` + `dist/voltagent.d.ts` + `public/voltagent.mjs` | Reusable library bundle (also feeds the demo).                     |
| `pnpm build`     | `dist/index.html` + `dist/assets/*.js`                            | Demo app that consumes `public/voltagent.mjs`.                     |

`pnpm build` clears `dist/` before running, so always invoke it **before** `pnpm build:lib` if you want both sets of artifacts in `dist/` at once. The demo only relies on `public/voltagent.mjs`, which is gitignored and recreated by `pnpm build:lib`.

## Verifying it actually runs in the worker

- DevTools → **Sources** → top-level shows your worker chunk; breakpoints inside `worker.ts` only fire while the worker is executing.
- DevTools → **Network**: the worker fetches `/voltagent.mjs` once, then makes requests to your Supabase URL and `api.anthropic.com` from the worker thread.
- `pnpm build` must finish without `Module not found` errors.

## Running the tests

```bash
pnpm test         # unit + build-smoke + lib-build (~14 s)
pnpm test:watch   # watch mode
```

> The lib-build smoke test runs `vite build --config vite.lib.config.ts` programmatically, so it requires the workspace packages to be built first:
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
- `vite-aliases.spec.ts` — every required Node specifier has an alias entry in `vite.shared.ts` and every replacement file actually exists.

Tests run in Node via `vitest.config.ts`.

### Build smokes

- `tests/build-smoke.spec.ts` — runs the demo build (`vite build`) into a temp directory. Verifies the worker chunk is emitted, contains the message-handler glue, and externalizes `/voltagent.mjs` (the import survives, no VoltAgent code is re-bundled).
- `tests/lib-build.spec.ts` — runs the lib build (`vite build --config vite.lib.config.ts`) into a temp directory. Verifies a single `voltagent.mjs` is emitted with all dependencies inlined (no `@voltagent/*`, `@ai-sdk/*`, `@supabase/*`, `node:*`, `ai`, `zod` bare imports survive), the runtime markers are present (`Agent`, `Memory`, `SupabaseMemoryAdapter`, `WorkerNoopContextManager`), every promised export is listed in the trailing `export {}` block, and the hand-written `voltagent.d.ts` ships with the right exports listed.

Confidence the example actually works in a worker:

| Concern                                                  | Evidence                                       |
| -------------------------------------------------------- | ---------------------------------------------- |
| Lib build bundles every Node import correctly            | `tests/lib-build.spec.ts`                      |
| Demo build leaves `/voltagent.mjs` external              | `tests/build-smoke.spec.ts`                    |
| Each shim is correct in isolation                        | 84 unit tests in `src/worker-shims/__tests__/` |

## Caveats

- **Don't ship API keys to the browser in production.** This example exposes the Anthropic key via `VITE_ANTHROPIC_API_KEY` for demonstration. In real apps, proxy LLM calls through a backend or use scoped, short-lived tokens.
- **Anthropic CORS.** Anthropic blocks browser-origin requests by default. The example sets `anthropic-dangerous-direct-browser-access: "true"` on the provider so the worker can reach `api.anthropic.com` directly. Development only — production should proxy through a server.
- **Telemetry context propagation is lossy.** With the worker async-hooks shim, OpenTelemetry context doesn't carry across `await` boundaries — spans appear flat instead of nested. Tracing still works for top-level operations.
- **No workspace toolkits in the worker.** Filesystem, sandbox, search, and skills toolkits all require Node. Calling them inside the worker throws a clear "Node-only module not available in Web Worker" error from `worker-shims/empty.ts`.
- **`isDeepStrictEqual` polyfill** in `node-util.ts` covers JSON-shaped data (primitives, arrays, plain objects, Dates, typed arrays) — sufficient for tool-call argument comparison. It does not cover `Map` / `Set` / cycles.
- **Version drift.** If a future `@voltagent/core` release adds new top-level `node:*` imports, the alias list may need extending. The shimmed `empty.ts` throws a descriptive error, making this self-diagnosing.
- **Build order.** `pnpm dev` and `pnpm build` consume `public/voltagent.mjs` and fail with a clear message if it's missing. Re-run `pnpm build:lib` after changing the lib entry, the worker shims, or VoltAgent dependencies.

## Key files to read first

- `src/lib.ts` — what gets bundled into `voltagent.mjs`
- `vite.lib.config.ts` — single-file lib build config (uses the shared aliases)
- `src/worker.ts` — the demo's thin worker glue
- `vite.config.ts` — externalizes `/voltagent.mjs`; otherwise unremarkable
- `src/worker-shims/async-hooks.ts` — how the OTel context manager is replaced with a Noop
