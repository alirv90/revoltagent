import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("vite build (demo)", () => {
  const tempOut = join(projectRoot, ".dist-build-smoke");

  beforeAll(() => {
    rmSync(tempOut, { recursive: true, force: true });
  });

  afterAll(() => {
    rmSync(tempOut, { recursive: true, force: true });
  });

  test("emits a thin worker chunk that imports /voltagent.mjs at runtime", async () => {
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

    const workerPath = join(assetsDir, worker as string);
    const workerCode = readFileSync(workerPath, "utf8");

    // The lib import must survive as an external runtime import — Vite must
    // not pull VoltAgent into the worker chunk.
    expect(workerCode).toMatch(/from\s*["']\/voltagent\.mjs["']/);

    // Negative: VoltAgent symbols belong in voltagent.mjs, not in the demo
    // worker chunk. If any of these match, the externalization broke and the
    // demo is double-bundling.
    expect(workerCode).not.toMatch(/WorkerNoopContextManager/);
    expect(workerCode).not.toMatch(/SupabaseMemoryAdapter\s*=\s*class/);
    expect(workerCode).not.toMatch(/createWorkflowChain\s*=/);

    // Positive: the demo's own glue is present.
    expect(workerCode).toMatch(/onmessage/);
    expect(workerCode).toMatch(/postMessage/);

    // Sanity: a thin glue chunk should be well under 200 KB unminified. The
    // pre-lib-bundle worker was ~2 MB.
    const workerSize = statSync(workerPath).size;
    expect(workerSize).toBeLessThan(200_000);
  }, 180_000);
});
