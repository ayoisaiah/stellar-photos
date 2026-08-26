export interface LocalDirectoryMeta {
  key: "folder";
  folderName: string;
  photoCount: number;
  updatedAt: number;
}

export interface LocalHandleRecord {
  key: "handle";
  handle: FileSystemDirectoryHandle;
  folderName: string;
  updatedAt: number;
}

const DB_NAME = "stellar-photos-local";
const DB_VERSION = 2;
const HANDLES_STORE = "handles";
const META_STORE = "meta";

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "bmp",
  "svg",
]);

export function isImageFileName(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase();

  return ext ? IMAGE_EXTENSIONS.has(ext) : false;
}

export function openLocalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        // Fresh setup
      }

      if (db.objectStoreNames.contains("photos")) {
        db.deleteObjectStore("photos");
      }

      if (!db.objectStoreNames.contains(HANDLES_STORE)) {
        db.createObjectStore(HANDLES_STORE, { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<number> {
  const imageNames = await listDirectoryImageNames(handle);

  if (imageNames.length === 0) {
    throw new Error("No image files found in the selected folder");
  }

  const db = await openLocalDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([HANDLES_STORE, META_STORE], "readwrite");
    const handlesStore = tx.objectStore(HANDLES_STORE);
    const metaStore = tx.objectStore(META_STORE);

    const handleRecord: LocalHandleRecord = {
      key: "handle",
      handle,
      folderName: handle.name,
      updatedAt: Date.now(),
    };

    const metaRecord: LocalDirectoryMeta = {
      key: "folder",
      folderName: handle.name,
      photoCount: imageNames.length,
      updatedAt: Date.now(),
    };

    handlesStore.put(handleRecord);
    metaStore.put(metaRecord);

    tx.oncomplete = () => resolve(imageNames.length);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openLocalDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLES_STORE, "readonly");
    const store = tx.objectStore(HANDLES_STORE);
    const request = store.get("handle");

    request.onsuccess = () => {
      const record = request.result as LocalHandleRecord | undefined;
      resolve(record?.handle ?? null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalMeta(): Promise<LocalDirectoryMeta | null> {
  const db = await openLocalDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const store = tx.objectStore(META_STORE);
    const request = store.get("folder");

    request.onsuccess = () =>
      resolve((request.result as LocalDirectoryMeta) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalPhotoCount(): Promise<number> {
  const meta = await getLocalMeta();

  return meta?.photoCount ?? 0;
}

export async function listDirectoryImageNames(
  handle: FileSystemDirectoryHandle,
): Promise<string[]> {
  const imageNames: string[] = [];

  for await (const [name, entry] of (
    handle as unknown as {
      entries(): AsyncIterable<[string, FileSystemHandle]>;
    }
  ).entries()) {
    if (entry.kind === "file" && isImageFileName(name)) {
      imageNames.push(name);
    }
  }

  return imageNames;
}

export async function getRandomDirectoryImage(
  excludeNames: string[] = [],
): Promise<{ handle: FileSystemFileHandle; name: string } | null> {
  const dirHandle = await getStoredDirectoryHandle();

  if (!dirHandle) return null;

  const names = await listDirectoryImageNames(dirHandle);

  if (names.length === 0) return null;

  const excludedSet = new Set(excludeNames);
  const candidates = names.filter((name) => !excludedSet.has(name));
  const pool = candidates.length > 0 ? candidates : names;
  const randomIndex = Math.floor(Math.random() * pool.length);
  const selectedName = pool[randomIndex];

  if (!selectedName) return null;

  const fileHandle = await dirHandle.getFileHandle(selectedName);

  return { handle: fileHandle, name: selectedName };
}

export async function readDirectoryFile(fileName: string): Promise<File> {
  const dirHandle = await getStoredDirectoryHandle();

  if (!dirHandle) {
    throw new Error(
      "No folder selected. Please choose a folder with images first.",
    );
  }

  const fileHandle = await dirHandle.getFileHandle(fileName);

  return fileHandle.getFile();
}

export async function clearLocalDb(): Promise<void> {
  const db = await openLocalDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([HANDLES_STORE, META_STORE], "readwrite");
    tx.objectStore(HANDLES_STORE).clear();
    tx.objectStore(META_STORE).clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
