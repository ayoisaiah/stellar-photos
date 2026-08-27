import type { BackgroundAsset, UncachedBackgroundAsset } from "../assets";
import type { ImageSource } from "../sources";
import { getRandomDirectoryImage, readDirectoryFile } from "./local-db";
import {
  getLocalPhotoFrequency,
  initializeLocalSettings,
} from "./local-settings";

interface LocalPayload {
  folderId?: string;
  folderName?: string;
  relativePath?: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

const localSource: ImageSource = {
  id: "local",
  name: "Local folder",
  supportsDownload: false,
  supportsInfo: false,
  initializeSettings: initializeLocalSettings,
  shouldRotate: shouldRotateLocal,
  getRandomAsset: getRandomLocalAsset,
  downloadAsset: downloadLocalAsset,
};

async function shouldRotateLocal(current: BackgroundAsset): Promise<boolean> {
  if (current.sourceId !== localSource.id) return true;

  const frequency = await getLocalPhotoFrequency();
  const elapsed = Date.now() - current.createdAt;

  switch (frequency) {
    case "every15minutes":
      return elapsed >= 15 * 60 * 1000;
    case "everyhour":
      return elapsed >= 60 * 60 * 1000;
    case "everyday":
      return elapsed >= 24 * 60 * 60 * 1000;
    case "newtab":
    default:
      return true;
  }
}

export async function computeLocalAssetId(
  folderId = "folder",
  relativePath = "photo",
): Promise<string> {
  const raw = `${folderId}:${relativePath}`;

  if (typeof crypto !== "undefined" && crypto.subtle?.digest) {
    try {
      const buffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(raw),
      );
      const hashArray = Array.from(new Uint8Array(buffer));
      const hex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32);
      return `${encodeURIComponent(folderId)}_${hex}`;
    } catch {
      // Fallback below
    }
  }

  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }

  return `${encodeURIComponent(folderId)}_${Math.abs(hash).toString(36)}`;
}

async function getRandomLocalAsset(): Promise<UncachedBackgroundAsset> {
  const triedPaths: string[] = [];

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const photo = await getRandomDirectoryImage(triedPaths);

    if (!photo) {
      throw new Error(
        "No folder selected or no photos found in the selected folder. Please choose a folder first.",
      );
    }

    try {
      const file = await photo.handle.getFile();
      const sourceAssetId = await computeLocalAssetId(
        photo.folderId,
        photo.relativePath || photo.name,
      );

      return {
        sourceId: localSource.id,
        sourceAssetId,
        width: 0,
        height: 0,
        color: null,
        description: photo.name,
        attribution: null,
        payloadVersion: 1,
        sourcePayload: {
          folderId: photo.folderId,
          folderName: photo.folderName,
          relativePath: photo.relativePath,
          name: photo.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        } satisfies LocalPayload,
        createdAt: Date.now(),
      };
    } catch (error) {
      if (
        (error as { name?: string })?.name === "LocalPermissionError" ||
        (error as { code?: string })?.code === "NEEDS_PAGE_CONTEXT"
      ) {
        throw error;
      }
      triedPaths.push(photo.relativePath || photo.name);
    }
  }

  throw new Error("No readable photos found in the selected folder.");
}

async function downloadLocalAsset(
  asset: UncachedBackgroundAsset,
): Promise<Response> {
  const payload = asset.sourcePayload as LocalPayload | undefined;
  const path = payload?.relativePath || payload?.name;
  if (!path) {
    throw new Error("Local asset has no file path");
  }

  const file = await readDirectoryFile(path, payload?.folderId);

  return new Response(file, {
    headers: {
      "content-type": file.type || "image/jpeg",
      "content-length": String(file.size),
    },
  });
}

export type { LocalPayload };
export { localSource };
