import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { consoleLogger, createConsoleLogger } from "../console-logger";

describe("consoleLogger", () => {
  let info: ReturnType<typeof vi.spyOn>;
  let debug: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    info = vi.spyOn(console, "info").mockImplementation(() => {});
    debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    info.mockRestore();
    debug.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  });

  test("forwards info → console.info", () => {
    consoleLogger.info("hello");
    expect(info).toHaveBeenCalledWith("hello");
  });

  test("trace and debug both go to console.debug", () => {
    consoleLogger.trace("t");
    consoleLogger.debug("d");
    expect(debug).toHaveBeenCalledTimes(2);
  });

  test("fatal routes to console.error", () => {
    consoleLogger.fatal("kaboom");
    expect(error).toHaveBeenCalledWith("kaboom");
  });

  test("warn forwards a context object", () => {
    consoleLogger.warn("oops", { code: 1 });
    expect(warn).toHaveBeenCalledWith("oops", { code: 1 });
  });

  test("child() prefixes log lines with formatted bindings", () => {
    const child = consoleLogger.child({ component: "supabase-memory" });
    child.info("init");
    expect(info).toHaveBeenCalledWith("[component=supabase-memory]", "init");
  });

  test("nested child() merges bindings", () => {
    const child = consoleLogger.child({ a: 1 }).child({ b: "x" });
    child.error("nope");
    expect(error).toHaveBeenCalledWith("[a=1 b=x]", "nope");
  });

  test("createConsoleLogger() initial bindings work like child()", () => {
    const logger = createConsoleLogger({ scope: "worker" });
    logger.info("ready");
    expect(info).toHaveBeenCalledWith("[scope=worker]", "ready");
  });

  test("logger surface satisfies all required methods", () => {
    for (const method of ["trace", "debug", "info", "warn", "error", "fatal"] as const) {
      expect(typeof consoleLogger[method]).toBe("function");
    }
    expect(typeof consoleLogger.child).toBe("function");
  });
});
