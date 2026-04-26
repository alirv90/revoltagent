import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

type GlobalWithEdge = typeof globalThis & { EdgeRuntime?: string };

describe("bootstrap.ts side effect", () => {
  const previous = (globalThis as GlobalWithEdge).EdgeRuntime;

  beforeAll(() => {
    (globalThis as GlobalWithEdge).EdgeRuntime = undefined;
    vi.resetModules();
  });

  afterAll(() => {
    (globalThis as GlobalWithEdge).EdgeRuntime = previous;
  });

  test("importing the module sets globalThis.EdgeRuntime to 'WebWorker'", async () => {
    expect((globalThis as GlobalWithEdge).EdgeRuntime).toBeUndefined();
    await import("../bootstrap");
    expect((globalThis as GlobalWithEdge).EdgeRuntime).toBe("WebWorker");
  });

  test("does not overwrite an existing EdgeRuntime value (??= semantics)", async () => {
    vi.resetModules();
    (globalThis as GlobalWithEdge).EdgeRuntime = "edge-light";
    await import("../bootstrap");
    expect((globalThis as GlobalWithEdge).EdgeRuntime).toBe("edge-light");
  });
});
