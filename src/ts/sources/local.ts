import {
  type BackgroundAsset,
  makeAsset,
  type UncachedBackgroundAsset,
} from "../assets";
import type { ImageSource } from "../sources";
import { getRandomDirectoryImage, readDirectoryFile } from "./local-db";

interface LocalPayload {
  folderId: string;
  folderName: string;
  relativePath: string;
  name: string;
}

const pendingFiles = new Map<string, File>();

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
  description: "Photographs from your local device",
  settingsTag: "stellar-local-settings",
  get supportsDownload() {
    return Boolean(this.getDownloadUrl);
  },
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
  const photo = await getRandomDirectoryImage();

  if (!photo) {
    throw new Error(
      "No folder selected or no photos found in the selected folder. Please choose a folder first.",
    );
  }

  const file = await photo.handle.getFile();
  const sourceAssetId = await computeLocalAssetId(
    photo.folderId,
    photo.relativePath,
  );

  pendingFiles.set(sourceAssetId, file);

  return makeAsset({
    sourceId: localSource.id,
    sourceAssetId,
    width: 0,
    height: 0,
    description: photo.name,
    attribution: null,
    sourcePayload: {
      folderId: photo.folderId,
      folderName: photo.folderName,
      relativePath: photo.relativePath,
      name: photo.name,
    } satisfies LocalPayload,
  });
}

async function downloadLocalAsset(
  asset: UncachedBackgroundAsset,
): Promise<Blob> {
  const cachedFile = pendingFiles.get(asset.sourceAssetId);
  if (cachedFile) {
    pendingFiles.delete(asset.sourceAssetId);
    return cachedFile;
  }

  const payload = asset.sourcePayload as LocalPayload | undefined;
  if (!payload?.relativePath || !payload.folderId) {
    throw new Error("Local asset has no file path");
  }

  return readDirectoryFile(payload.relativePath, payload.folderId);
}

export type { LocalPayload };
export { computeLocalAssetId, isLocalSupported, localSource };
