// Demo worker. All VoltAgent code now lives in the prebuilt lib bundle
// (`public/voltagent.mjs`, produced by `pnpm build:lib`). This file is just
// the message-handler glue. Vite externalizes the `/voltagent.mjs` import so
// the bundle is loaded at runtime, not re-bundled.
//
// `globalThis.EdgeRuntime = "WebWorker"` is set by the lib's bootstrap, which
// runs as the bundle's first side effect on import. Types come from the
// ambient declaration in `voltagent-module.d.ts`.
import {
  Agent,
  Memory,
  SupabaseMemoryAdapter,
  consoleLogger,
  createAnthropic,
  createWorkflowChain,
  z,
} from "/voltagent.mjs";

type WorkerRequest = {
  prompt: string;
  conversationId?: string;
  userId?: string;
};

type WorkerResponse = { ok: true; summary: string } | { ok: false; error: string };

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;

// Anthropic blocks browser-origin requests by default. The
// `anthropic-dangerous-direct-browser-access` header opts in. Production
// apps should proxy through their own backend instead of shipping the API
// key to the client.
const anthropic = createAnthropic({
  apiKey: env.VITE_ANTHROPIC_API_KEY ?? "",
  headers: {
    "anthropic-dangerous-direct-browser-access": "true",
  },
});

const memory = new Memory({
  storage: new SupabaseMemoryAdapter({
    supabaseUrl: env.VITE_SUPABASE_URL ?? "",
    supabaseKey: env.VITE_SUPABASE_KEY ?? "",
    logger: consoleLogger.child({ component: "supabase-memory" }),
  }),
});

const summarizer = new Agent({
  name: "summarizer",
  instructions: "You write a single-sentence summary of the user's input.",
  model: anthropic("claude-haiku-4-5"),
  memory,
  workspaceToolkits: false,
});

const workflow = createWorkflowChain({
  id: "worker-summarize",
  name: "Worker Summarize",
  purpose: "Summarize the prompt then echo with metadata.",
  input: z.object({ prompt: z.string() }),
  result: z.object({ summary: z.string() }),
})
  .andAgent(async ({ data }) => `Summarize: ${data.prompt}`, summarizer, {
    schema: z.object({ summary: z.string() }),
  })
  .andThen({
    id: "tag",
    execute: async ({ data }) => ({ summary: `[worker] ${data.summary}` }),
  });

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { prompt, conversationId, userId } = event.data;
  try {
    const execution = await workflow.run({ prompt }, { conversationId, userId });
    const status = await execution.status;
    const result = await execution.result;
    if (status !== "completed" || !result) {
      throw new Error(`Workflow ended with status=${status}`);
    }
    const reply: WorkerResponse = { ok: true, summary: result.summary };
    self.postMessage(reply);
  } catch (error) {
    const reply: WorkerResponse = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(reply);
  }
};
