import { describe, expect, test } from "vitest";

import {
  AsyncLocalStorage,
  AsyncResource,
  createHook,
  executionAsyncId,
  triggerAsyncId,
} from "../node-async-hooks";

describe("AsyncLocalStorage shim", () => {
  test("getStore returns undefined outside of run()", () => {
    const als = new AsyncLocalStorage<number>();
    expect(als.getStore()).toBeUndefined();
  });

  test("run() exposes the store inside the callback", () => {
    const als = new AsyncLocalStorage<{ id: string }>();
    const result = als.run({ id: "abc" }, () => als.getStore());
    expect(result).toEqual({ id: "abc" });
  });

  test("run() restores the previous store after the callback returns", () => {
    const als = new AsyncLocalStorage<number>();
    als.enterWith(1);
    als.run(2, () => {
      expect(als.getStore()).toBe(2);
    });
    expect(als.getStore()).toBe(1);
  });

  test("nested run() scopes work LIFO", () => {
    const als = new AsyncLocalStorage<string>();
    als.run("outer", () => {
      expect(als.getStore()).toBe("outer");
      als.run("inner", () => {
        expect(als.getStore()).toBe("inner");
      });
      expect(als.getStore()).toBe("outer");
    });
    expect(als.getStore()).toBeUndefined();
  });

  test("disable() clears the store", () => {
    const als = new AsyncLocalStorage<number>();
    als.enterWith(7);
    als.disable();
    expect(als.getStore()).toBeUndefined();
  });

  test("exit() runs callback with no store and restores after", () => {
    const als = new AsyncLocalStorage<number>();
    als.enterWith(7);
    als.exit(() => {
      expect(als.getStore()).toBeUndefined();
    });
    expect(als.getStore()).toBe(7);
  });
});

describe("AsyncResource shim", () => {
  test("runInAsyncScope invokes the callback synchronously", () => {
    const res = new AsyncResource("custom");
    const out = res.runInAsyncScope(() => "ok");
    expect(out).toBe("ok");
  });

  test("bind returns the same function reference", () => {
    const fn = () => 42;
    const res = new AsyncResource("custom");
    expect(res.bind(fn)).toBe(fn);
    expect(AsyncResource.bind(fn)).toBe(fn);
  });
});

describe("module-level helpers", () => {
  test("executionAsyncId / triggerAsyncId return 0 in worker", () => {
    expect(executionAsyncId()).toBe(0);
    expect(triggerAsyncId()).toBe(0);
  });

  test("createHook returns enable/disable noops", () => {
    const hook = createHook();
    expect(() => hook.enable()).not.toThrow();
    expect(() => hook.disable()).not.toThrow();
  });
});
