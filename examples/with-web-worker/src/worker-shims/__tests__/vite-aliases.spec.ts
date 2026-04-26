import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import { workerAliases } from "../../../vite.shared";

type AliasEntry = { find: string | RegExp; replacement: string };

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const aliases: AliasEntry[] = workerAliases;

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

describe("vite.shared.ts workerAliases", () => {
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
