import {
  commitSource,
  discardSource,
  ensureCurrent,
  initializeSettingsAndHistory,
  prepareSource,
  rotate,
  trackDownload,
} from "./actions";

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

  if (command === "ensure-current" || command === "rotate") return true;

  if (command === "prepare-source")
    return typeof (value as { sourceId?: unknown }).sourceId === "string";

  return (
    (command === "commit-source" ||
      command === "discard-source" ||
      command === "track-download") &&
    !!(value as { asset?: unknown }).asset &&
    typeof (value as { asset?: unknown }).asset === "object"
  );
}

async function dispatch(request: unknown): Promise<WorkerResult> {
  if (!isCommand(request))
    return {
      ok: false,
      error: { code: "INVALID_COMMAND", message: "Unknown command" },
    };

  try {
    let current;

    if (request.command === "ensure-current") {
      current = await ensureCurrent();
    } else if (request.command === "prepare-source") {
      current = await prepareSource(request.sourceId);
    } else if (request.command === "commit-source") {
      await commitSource(request.asset);
      current = null;
    } else if (request.command === "discard-source") {
      await discardSource(request.asset);
      current = null;
    } else if (request.command === "track-download") {
      await trackDownload(request.asset);
      current = null;
    } else {
      current = await rotate(Boolean(request.force));
    }

    return { ok: true, current };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected extension error";

    return { ok: false, error: { code: "OPERATION_FAILED", message } };
  }
}

export { dispatch };
