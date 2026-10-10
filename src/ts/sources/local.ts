import { makeAsset, type UncachedBackgroundAsset } from "../assets";
import type { ImageSource } from "../sources";
import { getRandomDirectoryImage } from "./local-db";

interface LocalPayload {
  folderId: string;
  folderName: string;
  relativePath: string;
  name: string;
}

const localSource: ImageSource = {
  id: "local",
  name: "Local folder",
  description: "Photographs from your local device",
  settingsTag: "stellar-local-settings",
  isSupported: isLocalSupported,
  fetchRandom,
};

function isLocalSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
      "function"
  );
}

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

async function fetchRandom(): Promise<{
  asset: UncachedBackgroundAsset;
  blob: Blob;
}> {
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

  const asset = makeAsset({
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

  return { asset, blob: file };
}

export {
  computeLocalAssetId,
  isLocalSupported,
  type LocalPayload,
  localSource,
};
