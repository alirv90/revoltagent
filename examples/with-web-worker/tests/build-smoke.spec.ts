import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("vite build", () => {
  // Use a fixed sibling dir instead of os.tmpdir() — `node:os` is aliased to
  // a throwing stub in this project's vite.config, even at test time.
  const tempOut = join(projectRoot, ".dist-build-smoke");

  beforeAll(() => {
    rmSync(tempOut, { recursive: true, force: true });
  });

  afterAll(() => {
    rmSync(tempOut, { recursive: true, force: true });
  });

  test("succeeds and emits a worker chunk that includes @voltagent/core", async () => {
    await build({
      configFile: resolve(projectRoot, "vite.config.ts"),
      root: projectRoot,
      logLevel: "warn",
      build: {
        outDir: tempOut,
        emptyOutDir: false,
        minify: false,
      },
    });

    expect(existsSync(tempOut)).toBe(true);
    const assetsDir = join(tempOut, "assets");
    expect(existsSync(assetsDir)).toBe(true);

    const assets = readdirSync(assetsDir);
    const worker = assets.find((f) => /^worker(-|\.).*\.js$/.test(f));
    expect(worker, `no worker chunk in [${assets.join(", ")}]`).toBeDefined();

    const indexHtml = join(tempOut, "index.html");
    expect(existsSync(indexHtml)).toBe(true);

    const workerCode = readFileSync(join(assetsDir, worker as string), "utf8");
    // Worker bundle must contain the agent runtime + the workspace shim
    // marker (a ContextManager method our async-hooks shim provides).
    expect(workerCode).toMatch(/SupabaseMemoryAdapter|MemoryAdapter|class\s+Memory\b|Agent\b/);
    expect(workerCode).toMatch(/WorkerNoopContextManager|active\(\)/);
  }, 180_000);
});
