import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("vite build (lib)", () => {
  // Same sibling-dir pattern as build-smoke.spec.ts: node:os is aliased to a
  // throwing stub in this project, so os.tmpdir() isn't usable at test time.
  const tempOut = join(projectRoot, ".dist-lib-smoke");

  beforeAll(() => {
    rmSync(tempOut, { recursive: true, force: true });
  });

  afterAll(() => {
    rmSync(tempOut, { recursive: true, force: true });
  });

  test("emits a single self-contained voltagent.mjs with a copied .d.ts", async () => {
    await build({
      configFile: resolve(projectRoot, "vite.lib.config.ts"),
      root: projectRoot,
      logLevel: "warn",
      build: {
        outDir: tempOut,
        emptyOutDir: false,
      },
    });

    expect(existsSync(tempOut)).toBe(true);

    const bundlePath = join(tempOut, "voltagent.mjs");
    expect(existsSync(bundlePath)).toBe(true);

    // Sanity: a real bundle including @voltagent/core, @supabase/supabase-js,
    // ai, and zod is going to be at least a few hundred KB even minified.
    const bundleSize = statSync(bundlePath).size;
    expect(bundleSize).toBeGreaterThan(100_000);

    // Only one .mjs file should be emitted; inlineDynamicImports + the
    // single-entry lib config should not produce additional chunks.
    const mjsFiles = readdirSync(tempOut).filter((f) => f.endsWith(".mjs"));
    expect(mjsFiles).toEqual(["voltagent.mjs"]);

    const bundleCode = readFileSync(bundlePath, "utf8");

    // Negative assertions: no externalized package imports survived. If any
    // of these match, Vite/Rollup left a dependency unbundled and the
    // single-file promise is broken.
    const externalPatterns = [
      /from\s*["']@voltagent\//,
      /from\s*["']node:/,
      /from\s*["']@ai-sdk\//,
      /from\s*["']@supabase\//,
      /from\s*["']ai["']/,
      /from\s*["']zod["']/,
    ];
    for (const pattern of externalPatterns) {
      expect(bundleCode, `bundle contains external import matching ${pattern}`).not.toMatch(
        pattern,
      );
    }

    // Positive markers: the runtime classes are present, and the bootstrap
    // alias chain pulled in our worker context manager shim.
    expect(bundleCode).toMatch(/Agent\b/);
    expect(bundleCode).toMatch(/class\s+Memory\b|Memory\b/);
    expect(bundleCode).toMatch(/SupabaseMemoryAdapter/);
    expect(bundleCode).toMatch(/createAnthropic/);
    expect(bundleCode).toMatch(/WorkerNoopContextManager|active\(\)/);

    // The bundle is built for browser/worker (node:* aliased to throwing
    // stubs), so dynamically importing it under Node fails on bundled deps
    // like sonic-boom that probe `util.inherits`. Verify the exposed
    // surface structurally instead: the trailing `export { ... }` block
    // must list every name we promised.
    const exportBlockMatch = bundleCode.match(/export\s*\{([^}]+)\}\s*;?\s*(?:\/\/[^\n]*)?\s*$/);
    expect(exportBlockMatch, "no trailing export {} block found in bundle").not.toBeNull();
    const exportNames = (exportBlockMatch as RegExpMatchArray)[1]
      .split(",")
      .map(
        (entry) =>
          entry
            .trim()
            .split(/\s+as\s+/)
            .pop() as string,
      )
      .filter(Boolean);
    for (const name of [
      "Agent",
      "Memory",
      "createWorkflowChain",
      "SupabaseMemoryAdapter",
      "createAnthropic",
      "z",
      "consoleLogger",
    ]) {
      expect(exportNames, `missing export "${name}"`).toContain(name);
    }

    // Mirror the postbuild copy step from `pnpm build:lib` and assert the
    // .d.ts arrives next to the bundle with the expected exports listed.
    copyFileSync(join(projectRoot, "voltagent.d.ts"), join(tempOut, "voltagent.d.ts"));
    const dtsPath = join(tempOut, "voltagent.d.ts");
    expect(existsSync(dtsPath)).toBe(true);
    const dtsCode = readFileSync(dtsPath, "utf8");
    expect(dtsCode).toMatch(/export\s*\{[^}]*\bAgent\b/);
    expect(dtsCode).toMatch(/export\s*\{[^}]*\bSupabaseMemoryAdapter\b/);
    expect(dtsCode).toMatch(/export\s+const\s+consoleLogger/);
  }, 240_000);
});
