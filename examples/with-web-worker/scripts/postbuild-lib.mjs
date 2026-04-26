// Runs after `vite build --config vite.lib.config.ts`. Copies the typed
// declarations next to the bundled .mjs and mirrors the bundle into
// public/ so the demo's worker can import it via the runtime URL
// `/voltagent.mjs`.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const copies = [
  ["voltagent.d.ts", "dist/voltagent.d.ts"],
  ["dist/voltagent.mjs", "public/voltagent.mjs"],
];

for (const [from, to] of copies) {
  const src = resolve(projectRoot, from);
  const dst = resolve(projectRoot, to);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  console.log(`copied ${from} -> ${to}`);
}
