const message =
  "A Node.js-only module was accessed at runtime inside a Web Worker. " +
  "Pass `workspaceToolkits: false` to your Agent and avoid features that require filesystem, " +
  "child processes, or other Node built-ins.";

const stub: ProxyHandler<Record<string, unknown>> = {
  get(_target, prop) {
    if (prop === "default") return new Proxy({}, stub);
    if (prop === Symbol.toPrimitive || prop === Symbol.toStringTag) return undefined;
    if (prop === "then") return undefined;
    if (prop === "__esModule") return true;
    throw new Error(`${message} (accessed property: ${String(prop)})`);
  },
  has() {
    return true;
  },
};

const handler = new Proxy({}, stub);

export default handler;
export const promises = handler;
export const constants = handler;
