import { ROOT_CONTEXT, context } from "@opentelemetry/api";
import { describe, expect, test } from "vitest";

import { AsyncHooksContextManager, AsyncLocalStorageContextManager } from "../async-hooks";

describe("AsyncHooksContextManager shim (worker)", () => {
  test("active() returns the global active context by default", () => {
    const cm = new AsyncHooksContextManager();
    expect(cm.active()).toBeDefined();
  });

  test("with() exposes the supplied context inside the callback", () => {
    const cm = new AsyncHooksContextManager();
    const ctx = ROOT_CONTEXT.setValue(Symbol.for("test"), 42);
    const result = cm.with(ctx, () => cm.active());
    expect(result).toBe(ctx);
  });

  test("with() restores the previous context after the callback", () => {
    const cm = new AsyncHooksContextManager();
    const ctxA = ROOT_CONTEXT.setValue(Symbol.for("a"), "A");
    const ctxB = ROOT_CONTEXT.setValue(Symbol.for("b"), "B");
    cm.with(ctxA, () => {
      expect(cm.active()).toBe(ctxA);
      cm.with(ctxB, () => {
        expect(cm.active()).toBe(ctxB);
      });
      expect(cm.active()).toBe(ctxA);
    });
  });

  test("with() forwards thisArg and rest args", () => {
    const cm = new AsyncHooksContextManager();
    const target = { value: 7 } as const;
    function fn(this: { value: number }, x: number, y: number) {
      return this.value + x + y;
    }
    const out = cm.with(ROOT_CONTEXT, fn, target, 2, 3);
    expect(out).toBe(12);
  });

  test("bind() returns the target unchanged", () => {
    const cm = new AsyncHooksContextManager();
    const fn = () => 1;
    expect(cm.bind(ROOT_CONTEXT, fn)).toBe(fn);
  });

  test("enable()/disable() are chainable noops", () => {
    const cm = new AsyncHooksContextManager();
    expect(cm.enable()).toBe(cm);
    expect(cm.disable()).toBe(cm);
  });

  test("AsyncLocalStorageContextManager is the same shape", () => {
    const cm = new AsyncLocalStorageContextManager();
    expect(typeof cm.with).toBe("function");
    expect(typeof cm.active).toBe("function");
    expect(typeof cm.enable).toBe("function");
  });

  test("setting the manager on the global context API does not throw", () => {
    const cm = new AsyncHooksContextManager();
    expect(() => context.setGlobalContextManager(cm)).not.toThrow();
    expect(context.active()).toBeDefined();
    context.disable();
  });
});
