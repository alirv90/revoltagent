import { fileURLToPath } from "node:url";

const shim = (name: string) =>
  fileURLToPath(new URL(`./src/worker-shims/${name}`, import.meta.url));

const empty = shim("empty.ts");
const pathBrowser = shim("path-browser.ts");
const nodeUtil = shim("node-util.ts");
const asyncHooks = shim("async-hooks.ts");
const nodeAsyncHooks = shim("node-async-hooks.ts");

const aliasNode = (name: string, replacement = empty) => [
  { find: new RegExp(`^node:${name}$`), replacement },
  { find: new RegExp(`^${name}$`), replacement },
];

// Worker-safe alias map shared by the demo (`vite.config.ts`) and the lib
// build (`vite.lib.config.ts`). Anything that needs a Node primitive is
// either polyfilled or stubbed here.
export const workerAliases = [
  { find: "@opentelemetry/context-async-hooks", replacement: asyncHooks },

  // MCP stdio transport requires node:child_process; not usable in worker.
  // Alias the file directly to avoid pulling its node:* imports.
  {
    find: /@modelcontextprotocol\/sdk\/(?:dist\/(?:esm|cjs)\/)?client\/stdio\.js$/,
    replacement: shim("mcp-stdio-stub.ts"),
  },
  { find: "cross-spawn", replacement: empty },

  // node:async_hooks gets a single-thread polyfill so OTel-style helpers
  // that probe AsyncLocalStorage continue to work.
  { find: /^node:async_hooks$/, replacement: nodeAsyncHooks },
  { find: /^async_hooks$/, replacement: nodeAsyncHooks },

  // node:util needs isDeepStrictEqual; provide a portable impl.
  ...aliasNode("util", nodeUtil),

  // node:path needs join/resolve/etc; provide a posix-compatible impl.
  ...aliasNode("path", pathBrowser),

  // Everything else is gated behind workspaceToolkits:false at runtime;
  // the bundler still needs the named exports to resolve.
  ...aliasNode("fs", shim("node-fs-stub.ts")),
  ...aliasNode("fs/promises", shim("node-fs-promises-stub.ts")),
  ...aliasNode("child_process", shim("node-child-process-stub.ts")),
  ...aliasNode("os"),
  ...aliasNode("module"),
  ...aliasNode("crypto"),
  ...aliasNode("stream"),
  ...aliasNode("stream/web"),
  ...aliasNode("http"),
  ...aliasNode("https"),
  ...aliasNode("process"),
  ...aliasNode("tty"),
  ...aliasNode("net"),
  ...aliasNode("zlib"),
  ...aliasNode("events"),
];

// Vite already replaces `process.env.NODE_ENV` for browser builds. We only
// need an extra define when bundling, and we must NOT propagate it to
// vitest (where `process.platform = ...` triggers a TypeError on the real
// Node process). Detect a vitest run via the VITEST env var.
export const workerDefine: Record<string, string> = process.env.VITEST
  ? {}
  : {
      "process.platform": JSON.stringify("browser"),
      global: "globalThis",
    };
