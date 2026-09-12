import { nextImage, trackDownload } from "./actions";
import type { BackgroundAsset } from "./assets";
import { readCachedImage, readCachedThumbnail } from "./cache";

type WorkerCommand =
  | { command: "nextImage" }
  | { command: "read-image"; cacheKey: string; thumbnail?: boolean }
  | { command: "track-download"; asset: BackgroundAsset };

type WorkerResult =
  | { ok: true; image?: string | null }
  | { ok: false; error: { code: string; message: string } };

function startServiceWorker(): void {
  chrome.runtime.onInstalled.addListener(() => {
    if (typeof navigator !== "undefined" && navigator.storage?.persist) {
      void navigator.storage.persist();
    }
  });

  chrome.runtime.onMessage.addListener(
    (
      request: unknown,
      _sender,
      sendResponse: (response: WorkerResult) => void,
    ) => {
      void dispatch(request)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          sendResponse({
            ok: false,
            error: {
              code: "OPERATION_FAILED",
              message:
                error instanceof Error
                  ? error.message
                  : "Unexpected extension error",
            },
          });
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
    if (request.command === "read-image") {
      return {
        ok: true,
        image: await cachedImageData(request.cacheKey, request.thumbnail),
      };
    }

    if (request.command === "track-download") {
      await trackDownload(request.asset);
      return { ok: true };
    }

    await nextImage();
    return { ok: true };
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

  if (command === "nextImage") return true;

  if (command === "read-image") {
    const { cacheKey, thumbnail } = value as {
      cacheKey?: unknown;
      thumbnail?: unknown;
    };

    return (
      typeof cacheKey === "string" &&
      /^https:\/\/cache\.stellar-photos\.invalid\/asset\/[^/?#]+\/[^/?#]+$/.test(
        cacheKey,
      ) &&
      (thumbnail === undefined || typeof thumbnail === "boolean")
    );
  }

  return (
    command === "track-download" &&
    !!(value as { asset?: unknown }).asset &&
    typeof (value as { asset?: unknown }).asset === "object"
  );
}

async function cachedImageData(
  cacheKey: string,
  thumbnail = false,
): Promise<string | null> {
  const response =
    (thumbnail ? await readCachedThumbnail(cacheKey) : undefined) ??
    (await readCachedImage(cacheKey));
  if (!response) return null;

  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());

  return `data:${blob.type || "application/octet-stream"};base64,${bytes.toBase64()}`;
}

export type { WorkerCommand, WorkerResult };
export { dispatch, startServiceWorker };
