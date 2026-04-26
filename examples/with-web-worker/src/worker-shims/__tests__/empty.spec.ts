import { describe, expect, test } from "vitest";

import emptyDefault, { constants, promises } from "../empty";

describe("empty.ts shim", () => {
  test("default export throws on property access", () => {
    expect(() => (emptyDefault as Record<string, unknown>).readFileSync).toThrow(/Web Worker/);
  });

  test("named promises export also throws on access", () => {
    expect(() => (promises as Record<string, unknown>).readFile).toThrow(/Web Worker/);
  });

  test("named constants export also throws on access", () => {
    expect(() => (constants as Record<string, unknown>).O_RDONLY).toThrow(/Web Worker/);
  });

  test("`then` access does NOT throw (so a require/import is not treated as a thenable)", () => {
    expect(() => (emptyDefault as { then?: unknown }).then).not.toThrow();
    expect((emptyDefault as { then?: unknown }).then).toBeUndefined();
  });

  test("__esModule access does NOT throw and is true (CJS interop)", () => {
    expect(() => (emptyDefault as { __esModule?: boolean }).__esModule).not.toThrow();
    expect((emptyDefault as { __esModule?: boolean }).__esModule).toBe(true);
  });

  test("error message names the missing property", () => {
    try {
      void (emptyDefault as Record<string, unknown>).spawn;
      throw new Error("should not reach");
    } catch (err) {
      expect((err as Error).message).toContain("spawn");
    }
  });
});
