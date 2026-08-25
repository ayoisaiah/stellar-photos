import { ensureCurrent, initializeSettingsAndHistory, rotate } from "./actions";

import type { WorkerCommand, WorkerResult } from "./types";

export function startServiceWorker(): void {
  chrome.runtime.onInstalled.addListener(() => {
    void initializeSettingsAndHistory().catch(() => undefined);
  });

  chrome.runtime.onMessage.addListener(
    (
      request: unknown,
      _sender,
      sendResponse: (response: WorkerResult) => void,
    ) => {
      void dispatch(request).then((result) => {
        sendResponse(result);
      });

      return true;
    },
  );
}

function isCommand(value: unknown): value is WorkerCommand {
  if (!value || typeof value !== "object") return false;

  const command = (value as { command?: unknown }).command;

  return command === "ensure-current" || command === "rotate";
}

async function dispatch(request: unknown): Promise<WorkerResult> {
  if (!isCommand(request))
    return {
      ok: false,
      error: { code: "INVALID_COMMAND", message: "Unknown command" },
    };

  try {
    const current =
      request.command === "ensure-current"
        ? await ensureCurrent()
        : await rotate();

    return { ok: true, current };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected extension error";

    return { ok: false, error: { code: "OPERATION_FAILED", message } };
  }
}

export { dispatch };
