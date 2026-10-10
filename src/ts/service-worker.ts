import { nextImage, trackDownload } from "./actions";
import type { BackgroundAsset } from "./assets";
import { readCachedImage } from "./cache";
import { isLocalPermissionError } from "./sources/local-db";

type WorkerCommand =
  | { command: "nextImage" }
  | { command: "read-image"; cacheKey: string; thumbnail?: boolean }
  | { command: "track-download"; asset: BackgroundAsset };

type WorkerResult =
  | { ok: true; image?: Blob | null }
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
  const command = request as WorkerCommand | null | undefined;

  try {
    switch (command?.command) {
      case "nextImage":
        await nextImage();
        return { ok: true };

      case "read-image": {
        const response =
          (command.thumbnail
            ? await readCachedImage(command.cacheKey, "thumbnail")
            : undefined) ?? (await readCachedImage(command.cacheKey));

        return { ok: true, image: response ? await response.blob() : null };
      }

      case "track-download":
        await trackDownload(command.asset);
        return { ok: true };

      default:
        return {
          ok: false,
          error: { code: "INVALID_COMMAND", message: "Unknown command" },
        };
    }
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

export type { WorkerCommand, WorkerResult };
export { dispatch, startServiceWorker };
