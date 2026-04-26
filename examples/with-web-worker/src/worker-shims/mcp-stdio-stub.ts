// Stub for @modelcontextprotocol/sdk/client/stdio.js. The stdio MCP transport
// requires `node:child_process` and is fundamentally incompatible with browsers.
// Stubbing it here lets `@voltagent/core` (which imports the symbol) bundle
// cleanly. Constructing the transport at runtime throws.

export const DEFAULT_INHERITED_ENV_VARS: string[] = [];

export function getDefaultEnvironment(): Record<string, string> {
  return {};
}

export class StdioClientTransport {
  constructor() {
    throw new Error(
      "StdioClientTransport is not available in a Web Worker. " +
        "Use SSE or Streamable HTTP transport instead.",
    );
  }
}
