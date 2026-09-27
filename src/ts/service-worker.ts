import { nextImage, trackDownload } from "./actions";
import type { BackgroundAsset } from "./assets";
import { isLocalPermissionError } from "./sources/local-db";

type WorkerCommand =
  | { command: "nextImage" }
  | { command: "track-download"; asset: BackgroundAsset };

type WorkerResult =
  | { ok: true }
  | { ok: false; error: { code: string; message: string } };

function startServiceWorker(): void {
  chrome.runtime.onInstalled.addListener(() => {
    if (navigator.storage?.persist) {
      void navigator.storage.persist();
    }
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

async function dispatch(request: unknown): Promise<WorkerResult> {
  if (!isCommand(request)) {
    return {
      ok: false,
      error: { code: "INVALID_COMMAND", message: "Unknown command" },
    };
  }

  try {
    if (request.command === "track-download") {
      await trackDownload(request.asset);
      return { ok: true };
    }

    await nextImage();
    return { ok: true };
  } catch (error) {
    const isPageContextError = isLocalPermissionError(error);

    const message =
      error instanceof Error ? error.message : "Unexpected extension error";

    return {
      ok: false,
      error: {
        code: isPageContextError ? "NEEDS_PAGE_CONTEXT" : "OPERATION_FAILED",
        message,
      },
    };
  }
}

function isCommand(value: unknown): value is WorkerCommand {
  if (!value || typeof value !== "object") return false;

  const command = (value as { command?: unknown }).command;

  if (command === "nextImage") return true;

  return (
    command === "track-download" &&
    !!(value as { asset?: unknown }).asset &&
    typeof (value as { asset?: unknown }).asset === "object"
  );
}

export type { WorkerCommand, WorkerResult };
export { dispatch, startServiceWorker };
