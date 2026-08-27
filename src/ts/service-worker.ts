import {
  ensureCurrent,
  initializeSettings,
  rotate,
  switchSource,
  trackDownload,
} from "./actions";
import type { BackgroundAsset } from "./assets";

type WorkerCommand =
  | { command: "ensure-current" }
  | { command: "rotate"; force?: boolean }
  | { command: "switch-source"; sourceId: string }
  | { command: "track-download"; asset: BackgroundAsset };

type WorkerResult =
  | { ok: true; current: BackgroundAsset | null }
  | { ok: false; error: { code: string; message: string } };

let initPromise: Promise<void> | null = null;

function initializeSettingsMemoized(): Promise<void> {
  initPromise ??= initializeSettings().catch((error) => {
    initPromise = null;
    throw error;
  });

  return initPromise;
}

function startServiceWorker(): void {
  chrome.runtime.onInstalled.addListener(() => {
    if (typeof navigator !== "undefined" && navigator.storage?.persist) {
      void navigator.storage.persist();
    }
    void initializeSettingsMemoized().catch(() => undefined);
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
  if (!isCommand(request))
    return {
      ok: false,
      error: { code: "INVALID_COMMAND", message: "Unknown command" },
    };

  try {
    let current;

    if (request.command === "ensure-current") {
      current = await ensureCurrent();
    } else if (request.command === "switch-source") {
      current = await switchSource(request.sourceId);
    } else if (request.command === "track-download") {
      await trackDownload(request.asset);
      current = null;
    } else {
      current = await rotate(Boolean(request.force));
    }

    return { ok: true, current };
  } catch (error) {
    const isPageContextError =
      (error as { code?: string })?.code === "NEEDS_PAGE_CONTEXT" ||
      (error instanceof Error &&
        (error.name === "LocalPermissionError" ||
          error.message.includes("getFileHandle") ||
          error.message.includes("not allowed")));

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

  if (command === "ensure-current" || command === "rotate") return true;

  if (command === "switch-source")
    return typeof (value as { sourceId?: unknown }).sourceId === "string";

  return (
    command === "track-download" &&
    !!(value as { asset?: unknown }).asset &&
    typeof (value as { asset?: unknown }).asset === "object"
  );
}

export type { WorkerCommand, WorkerResult };
export { dispatch, initializeSettingsMemoized, startServiceWorker };
