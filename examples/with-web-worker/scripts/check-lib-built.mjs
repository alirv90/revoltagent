// Pre-flight check for `pnpm dev` and `pnpm build`. The demo's worker
// imports the lib bundle via the runtime URL `/voltagent.mjs` (served from
// public/), so the bundle must exist before Vite starts.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(import.meta.url), "../..");
const expected = resolve(projectRoot, "public/voltagent.mjs");

if (!existsSync(expected)) {
  console.error(
    [
      "",
      "  public/voltagent.mjs is missing.",
      "",
      "  The demo loads VoltAgent from the prebuilt lib bundle. Run:",
      "",
      "      pnpm build:lib",
      "",
      "  to produce public/voltagent.mjs (and dist/voltagent.mjs for distribution),",
      "  then re-run this command.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
