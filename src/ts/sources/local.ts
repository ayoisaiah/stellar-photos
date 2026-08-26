// biome-ignore assist/source/organizeImports: Type-only imports are grouped separately per AGENTS.md.
import { getRandomDirectoryImage, readDirectoryFile } from "./local-db";
import {
  getLocalPhotoFrequency,
  initializeLocalSettings,
} from "./local-settings";

import type {
  BackgroundAsset,
  ImageSource,
  UncachedBackgroundAsset,
} from "../types";

export interface LocalPayload {
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

async function getRandomLocalAsset(): Promise<UncachedBackgroundAsset> {
  const photo = await getRandomDirectoryImage();

  if (!photo) {
    throw new Error(
      "No folder selected or no photos found in the selected folder. Please choose a folder first.",
    );
  }

  const file = await photo.handle.getFile();
  const sanitizedPath = (photo.relativePath || photo.name)
    .replace(/[^\w./-]/g, "_")
    .slice(0, 120);
  let width = 0;
  let height = 0;

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
    } catch {
      // Fallback if bitmap decoding is unavailable
    }
  }

  return {
    sourceId: localSource.id,
    sourceAssetId: encodeURIComponent(sanitizedPath || "photo"),
    width,
    height,
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
}

async function downloadLocalAsset(
  asset: UncachedBackgroundAsset,
): Promise<Response> {
  const payload = asset.sourcePayload as LocalPayload | undefined;
  const path =
    payload?.relativePath ||
    payload?.name ||
    decodeURIComponent(asset.sourceAssetId);
  const file = await readDirectoryFile(path, payload?.folderId);

  return new Response(file, {
    headers: {
      "content-type": file.type || "image/jpeg",
      "content-length": String(file.size),
    },
  });
}

export { localSource };
