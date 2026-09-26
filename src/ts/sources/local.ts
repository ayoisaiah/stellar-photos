import type { BackgroundAsset, UncachedBackgroundAsset } from "../assets";
import type { ImageSource } from "../sources";
import {
  getRandomDirectoryImage,
  isLocalPermissionError,
  readDirectoryFile,
} from "./local-db";

interface LocalPayload {
  folderId: string;
  folderName: string;
  relativePath: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

function isLocalSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
      "function"
  );
}

const localSource: ImageSource = {
  id: "local",
  name: "Local folder",
  isSupported: isLocalSupported,
  getRandomAsset: getRandomLocalAsset,
  downloadAsset: downloadLocalAsset,
};

async function computeLocalAssetId(
  folderId: string,
  relativePath: string,
): Promise<string> {
  const raw = `${folderId}:${relativePath}`;

  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  const hash = Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);

  return `${encodeURIComponent(folderId)}_${hash}`;
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
        photo.relativePath,
      );

      let width = 0;
      let height = 0;

      if (typeof createImageBitmap === "function") {
        try {
          const bitmap = await createImageBitmap(file);
          width = bitmap.width;
          height = bitmap.height;
          bitmap.close();
        } catch (error) {
          console.error(error);
        }
      }

      return {
        sourceId: localSource.id,
        sourceAssetId,
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
    } catch (error) {
      if (isLocalPermissionError(error)) {
        throw error;
      }

      triedPaths.push(photo.relativePath);
    }
  }

  throw new Error("No readable photos found in the selected folder.");
}

async function downloadLocalAsset(
  asset: UncachedBackgroundAsset,
): Promise<Response> {
  const payload = asset.sourcePayload as LocalPayload | undefined;
  if (!payload?.relativePath || !payload.folderId) {
    throw new Error("Local asset has no file path");
  }

  const file = await readDirectoryFile(payload.relativePath, payload.folderId);

  return new Response(file, {
    headers: {
      "content-type": file.type || "image/jpeg",
      "content-length": String(file.size),
    },
  });
}

export type { LocalPayload };
export { computeLocalAssetId, isLocalSupported, localSource };
