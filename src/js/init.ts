import { readCachedImage } from "./cache";
import { decodeHistory } from "./history";
import { readRawHistory } from "./storage";

import type { PhotoMetadata, WorkerCommand, WorkerResult } from "./types";

let objectUrl: string | null = null;
let requestInFlight = false;

function elements() {
  return {
    body: document.body,
    status: document.getElementById("status") as HTMLParagraphElement,
    retry: document.getElementById("retry") as HTMLButtonElement,
  };
}

function sendCommand(command: WorkerCommand): Promise<WorkerResult> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      command,
      (response: WorkerResult | undefined) => {
        if (chrome.runtime.lastError) {
          resolve({
            ok: false,
            error: {
              code: "RUNTIME_ERROR",
              message: chrome.runtime.lastError.message ?? "Runtime error",
            },
          });
        } else
          resolve(
            response ?? {
              ok: false,
              error: {
                code: "NO_RESPONSE",
                message: "The background process did not respond",
              },
            },
          );
      },
    );
  });
}

async function decodeObjectUrl(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("Cached image could not be decoded"));
    image.src = url;
  });
}

async function render(metadata: PhotoMetadata): Promise<boolean> {
  const response = await readCachedImage(metadata.cacheKey);
  if (!response) return false;

  const nextUrl = URL.createObjectURL(await response.blob());

  try {
    await decodeObjectUrl(nextUrl);
  } catch {
    URL.revokeObjectURL(nextUrl);
    return false;
  }

  const previous = objectUrl;

  objectUrl = nextUrl;
  elements().body.style.backgroundImage = `url("${nextUrl}")`;
  elements().body.classList.add("has-image");

  if (previous) URL.revokeObjectURL(previous);

  return true;
}

async function optimisticCurrent(): Promise<PhotoMetadata | null> {
  try {
    const state = decodeHistory(await readRawHistory());
    const current = state?.history[0] ?? null;

    return current && (await render(current)) ? current : null;
  } catch {
    return null;
  }
}

async function ensureAndRender(): Promise<void> {
  if (requestInFlight) return;

  requestInFlight = true;

  const { status, retry } = elements();

  status.textContent = "Finding a stellar photo…";
  retry.hidden = true;
  retry.disabled = true;

  try {
    const result = await sendCommand({ command: "ensure-current" });
    if (!result.ok) throw new Error(result.error.message);
    if (!result.current || !(await render(result.current)))
      throw new Error("No usable image is available yet");
    status.textContent = "Photo ready";
  } catch {
    status.textContent =
      "We couldn’t load a photo. Check your connection and try again.";
    retry.hidden = false;
  } finally {
    requestInFlight = false;
    retry.disabled = false;
  }
}

async function start(): Promise<void> {
  elements().retry.addEventListener("click", () => {
    void ensureAndRender();
  });

  const current = await optimisticCurrent();

  if (current) void sendCommand({ command: "rotate" });
  else await ensureAndRender();
}

window.addEventListener("beforeunload", () => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
});
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => {
    void start();
  });
else void start();

export { optimisticCurrent, render, sendCommand };
