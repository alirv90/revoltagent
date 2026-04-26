import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import viteConfig from "../../../vite.config";

type AliasEntry = { find: string | RegExp; replacement: string };

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const aliases = (() => {
  const resolved =
    typeof viteConfig === "function"
      ? viteConfig({ command: "build", mode: "production" })
      : viteConfig;
  const cfg = resolved as unknown as { resolve?: { alias?: AliasEntry[] } };
  return cfg.resolve?.alias ?? [];
})();

const required = [
  "@opentelemetry/context-async-hooks",
  "node:async_hooks",
  "node:util",
  "node:fs",
  "node:fs/promises",
  "node:child_process",
  "node:os",
  "node:module",
  "node:stream/web",
  "node:crypto",
  "node:path",
];

describe("vite.config.ts resolve.alias", () => {
  test("contains every required Node-only specifier", () => {
    for (const spec of required) {
      const matched = aliases.some((entry) =>
        typeof entry.find === "string"
          ? entry.find === spec
          : entry.find instanceof RegExp && entry.find.test(spec),
      );
      expect(matched, `missing alias for ${spec}`).toBe(true);
    }
  });

  test("each alias replacement points at a file that exists", () => {
    expect(aliases.length).toBeGreaterThan(0);
    for (const entry of aliases) {
      expect(
        existsSync(entry.replacement),
        `replacement file missing for ${String(entry.find)}: ${entry.replacement}`,
      ).toBe(true);
    }
  });

  test("each replacement is inside the project", () => {
    for (const entry of aliases) {
      expect(entry.replacement.startsWith(projectRoot)).toBe(true);
    }
  });
});
