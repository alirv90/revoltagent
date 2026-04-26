// MUST be the first import: sets globalThis.EdgeRuntime so @voltagent/core's
// isServerlessRuntime() picks the serverless observability path. Same
// load-bearing pattern as src/worker.ts.
import "./worker-shims/bootstrap";

export { Agent, Memory, createWorkflowChain } from "@voltagent/core";
export { SupabaseMemoryAdapter } from "@voltagent/supabase";
export { createAnthropic } from "@ai-sdk/anthropic";
export { z } from "zod";
export { consoleLogger } from "./worker-shims/console-logger";
