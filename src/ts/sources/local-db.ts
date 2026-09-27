interface LocalFolderRecord {
  id: string;
  folderName: string;
  handle: FileSystemDirectoryHandle;
  imagePaths: string[];
}

interface RandomLocalImageResult {
  handle: FileSystemFileHandle;
  name: string;
  relativePath: string;
  folderId: string;
  folderName: string;
}

const DB_NAME = "stellar-photos-local";
const DB_VERSION = 4;
const FOLDERS_STORE = "folders";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

class LocalPermissionError extends Error {
  code = "NEEDS_PAGE_CONTEXT";

  constructor(
    message = "Folder access needs to be re-authorized. Please re-select or rescan the folder in Settings.",
  ) {
    super(message);
    this.name = "LocalPermissionError";
  }
}

function isLocalPermissionError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof LocalPermissionError) return true;

  const err = error as { name?: string; code?: string };

  return (
    err.name === "LocalPermissionError" ||
    err.name === "NotAllowedError" ||
    err.code === "NEEDS_PAGE_CONTEXT"
  );
}

function isImageFileName(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase();

  return ext ? IMAGE_EXTENSIONS.has(ext) : false;
}

async function withLocalDb<T>(
  callback: (db: IDBDatabase) => Promise<T>,
): Promise<T> {
  const db = await openLocalDb();

  try {
    return await callback(db);
  } finally {
    db.close();
  }
}

function openLocalDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        db.createObjectStore(FOLDERS_STORE, { keyPath: "id" });
      }
    };

    request.onblocked = () => {
      reject(new Error("IndexedDB upgrade blocked by an open connection"));
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

function withFolderStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return withLocalDb(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(FOLDERS_STORE, mode);
        const request = operation(tx.objectStore(FOLDERS_STORE));

        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

async function listDirectoryImagePaths(
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
  } catch (error) {
    if (!currentPath) throw error;

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

async function verifyHandlePermission(
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

async function getFileHandleByPath(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<FileSystemFileHandle> {
  const parts = relativePath.split("/").filter(Boolean);
  const fileName = parts.pop();

  if (!fileName) {
    throw new Error("Invalid file path");
  }

  const hasPermission = await verifyHandlePermission(rootHandle, "read");
  if (!hasPermission) {
    throw new LocalPermissionError();
  }

  let currentDir = rootHandle;

  for (const dirName of parts) {
    currentDir = await currentDir.getDirectoryHandle(dirName);
  }

  return currentDir.getFileHandle(fileName);
}

async function addDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<LocalFolderRecord> {
  const imagePaths = await listDirectoryImagePaths(handle);

  if (imagePaths.length === 0) {
    throw new Error("No image files found in the selected folder");
  }

  const existingRecords = await listStoredFolderRecords();
  for (const existing of existingRecords) {
    try {
      if (await handle.isSameEntry(existing.handle)) {
        const updated: LocalFolderRecord = {
          ...existing,
          handle,
          imagePaths,
        };
        await withFolderStore("readwrite", (store) => store.put(updated));

        return updated;
      }
    } catch {
      // Fallback
    }
  }

  const record: LocalFolderRecord = {
    id: crypto.randomUUID(),
    folderName: handle.name,
    handle,
    imagePaths,
  };

  await withFolderStore("readwrite", (store) => store.put(record));

  return record;
}

async function rescanFolderRecord(
  record: LocalFolderRecord,
): Promise<LocalFolderRecord> {
  const imagePaths = await listDirectoryImagePaths(record.handle);
  const updated: LocalFolderRecord = {
    ...record,
    imagePaths,
  };

  await withFolderStore("readwrite", (store) => store.put(updated));

  return updated;
}

async function rescanAllFolders(): Promise<LocalFolderRecord[]> {
  const records = await listStoredFolderRecords();
  const updatedRecords: LocalFolderRecord[] = [];

  for (const record of records) {
    try {
      updatedRecords.push(await rescanFolderRecord(record));
    } catch {
      updatedRecords.push(record);
    }
  }

  return updatedRecords;
}

async function removeDirectoryHandle(id: string): Promise<void> {
  await withFolderStore("readwrite", (store) => store.delete(id));
}

async function listStoredFolderRecords(): Promise<LocalFolderRecord[]> {
  return withFolderStore<LocalFolderRecord[]>(
    "readonly",
    (store) => store.getAll() as IDBRequest<LocalFolderRecord[]>,
  );
}

async function getRandomDirectoryImage(
  excludePaths: string[] = [],
): Promise<RandomLocalImageResult | null> {
  const records = await listStoredFolderRecords();
  if (records.length === 0) return null;

  const excludedSet = new Set(excludePaths);
  const candidates: { record: LocalFolderRecord; path: string }[] = [];

  for (const record of records) {
    for (const path of record.imagePaths) {
      if (!excludedSet.has(path)) {
        candidates.push({ record, path });
      }
    }
  }

  if (candidates.length === 0 && excludedSet.size > 0) {
    for (const record of records) {
      for (const path of record.imagePaths) {
        candidates.push({ record, path });
      }
    }
  }

  if (candidates.length === 0) return null;

  const candidate = candidates[Math.floor(Math.random() * candidates.length)]!;
  const fileHandle = await getFileHandleByPath(
    candidate.record.handle,
    candidate.path,
  );

  return {
    handle: fileHandle,
    name: candidate.path.split("/").pop() || candidate.path,
    relativePath: candidate.path,
    folderId: candidate.record.id,
    folderName: candidate.record.folderName,
  };
}

async function readDirectoryFile(
  relativePath: string,
  folderId: string,
): Promise<File> {
  const folderRecord = await withFolderStore<LocalFolderRecord | undefined>(
    "readonly",
    (store) => store.get(folderId) as IDBRequest<LocalFolderRecord | undefined>,
  );

  if (!folderRecord) {
    throw new Error("Target folder not found.");
  }

  const fileHandle = await getFileHandleByPath(
    folderRecord.handle,
    relativePath,
  );

  return fileHandle.getFile();
}

export type { LocalFolderRecord, RandomLocalImageResult };
export {
  addDirectoryHandle,
  getFileHandleByPath,
  getRandomDirectoryImage,
  isImageFileName,
  isLocalPermissionError,
  LocalPermissionError,
  listDirectoryImagePaths,
  listStoredFolderRecords,
  readDirectoryFile,
  removeDirectoryHandle,
  rescanAllFolders,
  verifyHandlePermission,
};
