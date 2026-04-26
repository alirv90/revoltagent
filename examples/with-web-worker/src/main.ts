type WorkerResponse = { ok: true; summary: string } | { ok: false; error: string };

const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

const form = document.querySelector<HTMLFormElement>("#prompt-form");
const input = document.querySelector<HTMLTextAreaElement>("#prompt");
const out = document.querySelector<HTMLPreElement>("#output");
const status = document.querySelector<HTMLSpanElement>("#status");

if (!form || !input || !out || !status) {
  throw new Error("Missing required DOM nodes");
}

worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
  const data = event.data;
  if (data.ok) {
    out.textContent = data.summary;
    status.textContent = "done";
  } else {
    out.textContent = data.error;
    status.textContent = "error";
  }
};

worker.onerror = (event) => {
  out.textContent = event.message;
  status.textContent = "error";
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = input.value.trim();
  if (!prompt) return;
  status.textContent = "running…";
  out.textContent = "";
  worker.postMessage({
    prompt,
    conversationId: "demo-conversation",
    userId: "demo-user",
  });
});
