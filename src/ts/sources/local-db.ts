export interface LocalFolderRecord {
  id: string;
  key?: string;
  folderName: string;
  handle: FileSystemDirectoryHandle;
  photoCount: number;
  imagePaths: string[];
  lastScannedAt: number;
  updatedAt: number;
}

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

export interface RandomLocalImageResult {
  handle: FileSystemFileHandle;
  name: string;
  relativePath: string;
  folderId: string;
  folderName: string;
}

const DB_NAME = "stellar-photos-local";
const DB_VERSION = 3;
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
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      request = indexedDB.open(DB_NAME);
    }

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
        db.createObjectStore(HANDLES_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    request.onblocked = () => {
      // Avoid hanging if an existing database connection is open
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => {
      if (request.error?.name === "VersionError") {
        const fallbackRequest = indexedDB.open(DB_NAME);
        fallbackRequest.onsuccess = () => resolve(fallbackRequest.result);
        fallbackRequest.onerror = () => reject(fallbackRequest.error);
        return;
      }

      reject(request.error);
    };
  });
}

export async function listDirectoryImagePaths(
  handle: FileSystemDirectoryHandle,
  maxDepth = 10,
  currentPath = "",
): Promise<string[]> {
  const imagePaths: string[] = [];

  try {
    for await (const [name, entry] of (
      handle as unknown as {
        entries(): AsyncIterable<[string, FileSystemHandle]>;
      }
    ).entries()) {
      if (name.startsWith(".")) continue;

      if (entry.kind === "file" && isImageFileName(name)) {
        imagePaths.push(currentPath ? `${currentPath}/${name}` : name);
      } else if (entry.kind === "directory" && maxDepth > 0) {
        const subPaths = await listDirectoryImagePaths(
          entry as FileSystemDirectoryHandle,
          maxDepth - 1,
          currentPath ? `${currentPath}/${name}` : name,
        );
        imagePaths.push(...subPaths);
      }
    }
  } catch {
    // Graceful fallback for restricted subfolders
  }

  return imagePaths;
}

interface FileSystemHandleWithPermissions {
  queryPermission?: (descriptor?: {
    mode?: "read" | "readwrite";
  }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: {
    mode?: "read" | "readwrite";
  }) => Promise<PermissionState>;
}

export async function verifyHandlePermission(
  handle: FileSystemHandle,
  mode: "read" | "readwrite" = "read",
): Promise<boolean> {
  try {
    const handleWithPerms =
      handle as unknown as FileSystemHandleWithPermissions;

    if (typeof handleWithPerms.queryPermission !== "function") {
      return true;
    }

    const currentStatus = await handleWithPerms.queryPermission({ mode });
    if (currentStatus === "granted") {
      return true;
    }

    if (typeof handleWithPerms.requestPermission === "function") {
      const requestedStatus = await handleWithPerms.requestPermission({ mode });
      return requestedStatus === "granted";
    }
  } catch {
    return false;
  }

  return false;
}

export async function getFileHandleByPath(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<FileSystemFileHandle> {
  const parts = relativePath.split("/").filter(Boolean);
  const fileName = parts.pop();

  if (!fileName) {
    throw new Error("Invalid file path");
  }

  await verifyHandlePermission(rootHandle, "read");

  let currentDir = rootHandle;

  for (const dirName of parts) {
    currentDir = await currentDir.getDirectoryHandle(dirName);
  }

  return currentDir.getFileHandle(fileName);
}

export async function addDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<LocalFolderRecord> {
  const imagePaths = await listDirectoryImagePaths(handle);

  if (imagePaths.length === 0) {
    throw new Error("No image files found in the selected folder");
  }

  const db = await openLocalDb();
  const now = Date.now();
  const id = `folder_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const record: LocalFolderRecord = {
    id,
    key: id,
    folderName: handle.name,
    handle,
    photoCount: imagePaths.length,
    imagePaths,
    lastScannedAt: now,
    updatedAt: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLES_STORE, "readwrite");
    const store = tx.objectStore(HANDLES_STORE);
    store.put(record);

    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function updateFolderRecord(
  record: LocalFolderRecord,
): Promise<void> {
  const db = await openLocalDb();
  const normalizedRecord = {
    ...record,
    key: record.key || record.id,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLES_STORE, "readwrite");
    const store = tx.objectStore(HANDLES_STORE);
    store.put(normalizedRecord);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function rescanFolderRecord(
  record: LocalFolderRecord,
): Promise<LocalFolderRecord> {
  const imagePaths = await listDirectoryImagePaths(record.handle);
  const updated: LocalFolderRecord = {
    ...record,
    key: record.key || record.id,
    imagePaths,
    photoCount: imagePaths.length,
    lastScannedAt: Date.now(),
  };

  await updateFolderRecord(updated);

  return updated;
}

export async function rescanAllFolders(): Promise<LocalFolderRecord[]> {
  const records = await listStoredFolderRecords();
  const updatedRecords: LocalFolderRecord[] = [];

  for (const record of records) {
    try {
      const updated = await rescanFolderRecord(record);
      updatedRecords.push(updated);
    } catch {
      updatedRecords.push(record);
    }
  }

  return updatedRecords;
}

export async function removeDirectoryHandle(id: string): Promise<void> {
  const db = await openLocalDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLES_STORE, "readwrite");
    const store = tx.objectStore(HANDLES_STORE);
    store.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function listStoredFolderRecords(): Promise<LocalFolderRecord[]> {
  const db = await openLocalDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLES_STORE, "readonly");
    const store = tx.objectStore(HANDLES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = (request.result as LocalFolderRecord[]) || [];
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getStoredFolderRecord(
  id?: string,
): Promise<LocalFolderRecord | null> {
  const records = await listStoredFolderRecords();

  if (records.length === 0) return null;
  if (id) {
    return records.find((r) => r.id === id) ?? null;
  }

  return records[0] ?? null;
}

export async function getLocalPhotoCount(): Promise<number> {
  const records = await listStoredFolderRecords();

  return records.reduce((sum, r) => sum + (r.photoCount || 0), 0);
}

export async function getRandomDirectoryImage(
  excludePaths: string[] = [],
): Promise<RandomLocalImageResult | null> {
  const records = await listStoredFolderRecords();

  if (records.length === 0) return null;

  const candidates: {
    folderId: string;
    folderName: string;
    rootHandle: FileSystemDirectoryHandle;
    relativePath: string;
    name: string;
  }[] = [];

  for (const record of records) {
    const paths =
      record.imagePaths && record.imagePaths.length > 0
        ? record.imagePaths
        : await listDirectoryImagePaths(record.handle);

    for (const relPath of paths) {
      const name = relPath.split("/").pop() || relPath;
      candidates.push({
        folderId: record.id,
        folderName: record.folderName,
        rootHandle: record.handle,
        relativePath: relPath,
        name,
      });
    }
  }

  if (candidates.length === 0) return null;

  const excludedSet = new Set(excludePaths);
  const unselected = candidates.filter(
    (c) => !excludedSet.has(c.relativePath) && !excludedSet.has(c.name),
  );
  const pool = unselected.length > 0 ? unselected : candidates;
  const randomIndex = Math.floor(Math.random() * pool.length);
  const chosen = pool[randomIndex];

  if (!chosen) return null;

  const fileHandle = await getFileHandleByPath(
    chosen.rootHandle,
    chosen.relativePath,
  );

  return {
    handle: fileHandle,
    name: chosen.name,
    relativePath: chosen.relativePath,
    folderId: chosen.folderId,
    folderName: chosen.folderName,
  };
}

export async function readDirectoryFile(
  relativePath: string,
  folderId?: string,
): Promise<File> {
  const records = await listStoredFolderRecords();

  if (records.length === 0) {
    throw new Error(
      "No folder selected. Please choose a folder with images first.",
    );
  }

  const folderRecord = folderId
    ? records.find((r) => r.id === folderId) || records[0]
    : records[0];

  if (!folderRecord) {
    throw new Error("Target folder handle not found.");
  }

  const fileHandle = await getFileHandleByPath(
    folderRecord.handle,
    relativePath,
  );

  return fileHandle.getFile();
}

export async function saveDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<number> {
  const record = await addDirectoryHandle(handle);

  return record.photoCount;
}

export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const record = await getStoredFolderRecord();

  return record?.handle ?? null;
}

export async function getLocalMeta(): Promise<LocalDirectoryMeta | null> {
  const records = await listStoredFolderRecords();

  if (records.length === 0) return null;

  const total = records.reduce((sum, r) => sum + (r.photoCount || 0), 0);
  const names = records.map((r) => r.folderName).join(", ");

  return {
    key: "folder",
    folderName: names,
    photoCount: total,
    updatedAt: records[0]?.updatedAt ?? Date.now(),
  };
}

export async function listDirectoryImageNames(
  handle: FileSystemDirectoryHandle,
): Promise<string[]> {
  return listDirectoryImagePaths(handle);
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
