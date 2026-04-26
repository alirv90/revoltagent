import type { Logger } from "@voltagent/internal";

type Level = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
type ConsoleMethod = "debug" | "info" | "warn" | "error";

const sinks: Record<Level, ConsoleMethod> = {
  trace: "debug",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "error",
};

const formatBindings = (bindings: Record<string, unknown>): string =>
  Object.entries(bindings)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" ");

const buildLogger = (bindings: Record<string, unknown>): Logger => {
  const prefix = Object.keys(bindings).length ? `[${formatBindings(bindings)}]` : "";
  const log = (level: Level) => (msg: string, context?: object) => {
    const fn = console[sinks[level]];
    const args: unknown[] = [];
    if (prefix) args.push(prefix);
    args.push(msg);
    if (context) args.push(context);
    fn(...args);
  };

  return {
    trace: log("trace"),
    debug: log("debug"),
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
    fatal: log("fatal"),
    child: (extra: Record<string, unknown>) => buildLogger({ ...bindings, ...extra }),
  };
};

export const consoleLogger: Logger = buildLogger({});

export const createConsoleLogger = (bindings: Record<string, unknown> = {}): Logger =>
  buildLogger(bindings);
