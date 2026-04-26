import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

type WorkerScope = typeof globalThis & {
  self?: typeof globalThis;
  onmessage?: ((event: MessageEvent) => void) | null;
  postMessage?: (message: unknown) => void;
};

describe("worker module loads in a worker-like environment", () => {
  const scope = globalThis as WorkerScope;
  const previousSelf = scope.self;
  const previousOnMessage = scope.onmessage;

  beforeAll(() => {
    scope.self = scope;
    scope.onmessage = null;
    scope.postMessage = () => {};
    Object.assign((import.meta as unknown as { env: Record<string, string> }).env, {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_KEY: "anon-key",
      VITE_OPENAI_API_KEY: "sk-test",
    });
    // Stub fetch so any eager Supabase init does not actually hit the network.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200 })),
    );
  });

  afterAll(() => {
    scope.self = previousSelf;
    scope.onmessage = previousOnMessage ?? null;
    vi.unstubAllGlobals();
  });

  test("dynamic import of worker.ts evaluates without throwing", async () => {
    await expect(import("../src/worker.ts?integration-load")).resolves.toBeDefined();
  });

  test("after import, self.onmessage is set", () => {
    expect(typeof scope.onmessage).toBe("function");
  });
});
