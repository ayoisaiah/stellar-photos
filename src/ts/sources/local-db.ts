export interface LocalFolderRecord {
  id: string;
  folderName: string;
  handle: FileSystemDirectoryHandle;
  photoCount: number;
  imagePaths: string[];
  lastScannedAt: number;
  updatedAt: number;
}

interface RandomLocalImageResult {
  handle: FileSystemFileHandle;
  name: string;
  relativePath: string;
  folderId: string;
  folderName: string;
}

const DB_NAME = "stellar-photos-local";
const DB_VERSION = 1;
const FOLDERS_STORE = "folders";

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

class LocalPermissionError extends Error {
  code = "NEEDS_PAGE_CONTEXT";

  constructor(
    message = "Folder access needs to be re-authorized. Please re-select or rescan the folder in Settings.",
  ) {
    super(message);
    this.name = "LocalPermissionError";
  }
}

export function isImageFileName(name: string): boolean {
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

      db.createObjectStore(FOLDERS_STORE, { keyPath: "id" });
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

export async function addDirectoryHandle(
  handle: FileSystemDirectoryHandle,
): Promise<LocalFolderRecord> {
  const imagePaths = await listDirectoryImagePaths(handle);

  if (imagePaths.length === 0) {
    throw new Error("No image files found in the selected folder");
  }

  const existingRecords = await listStoredFolderRecords();
  for (const existing of existingRecords) {
    if (typeof handle.isSameEntry === "function") {
      try {
        if (await handle.isSameEntry(existing.handle)) {
          const updated = {
            ...existing,
            handle,
            photoCount: imagePaths.length,
            imagePaths,
            lastScannedAt: Date.now(),
          };
          await withFolderStore("readwrite", (store) => store.put(updated));

          return updated;
        }
      } catch {
        // Fallback
      }
    }
  }

  const now = Date.now();
  const record: LocalFolderRecord = {
    id: crypto.randomUUID(),
    folderName: handle.name,
    handle,
    photoCount: imagePaths.length,
    imagePaths,
    lastScannedAt: now,
    updatedAt: now,
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
    photoCount: imagePaths.length,
    lastScannedAt: Date.now(),
  };

  await withFolderStore("readwrite", (store) => store.put(updated));

  return updated;
}

export async function rescanAllFolders(): Promise<LocalFolderRecord[]> {
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

export async function removeDirectoryHandle(id: string): Promise<void> {
  await withFolderStore("readwrite", (store) => store.delete(id));
}

export async function listStoredFolderRecords(): Promise<LocalFolderRecord[]> {
  return withFolderStore<LocalFolderRecord[]>(
    "readonly",
    (store) => store.getAll() as IDBRequest<LocalFolderRecord[]>,
  );
}

export async function getLocalPhotoCount(): Promise<number> {
  const records = await listStoredFolderRecords();

  return records.reduce((sum, record) => sum + record.photoCount, 0);
}

export async function getRandomDirectoryImage(
  excludePaths: string[] = [],
): Promise<RandomLocalImageResult | null> {
  const records = await listStoredFolderRecords();

  if (records.length === 0) return null;

  const excludedSet = new Set(excludePaths);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    let chosenRecord: LocalFolderRecord | null = null;
    let chosenPath: string | null = null;
    let matches = 0;

    for (const record of records) {
      for (const relPath of record.imagePaths) {
        const name = relPath.split("/").pop() || relPath;
        if (!excludedSet.has(relPath) && !excludedSet.has(name)) {
          matches += 1;
          if (Math.random() < 1 / matches) {
            chosenRecord = record;
            chosenPath = relPath;
          }
        }
      }
    }

    if (!chosenRecord || !chosenPath) {
      if (excludedSet.size > 0) {
        excludedSet.clear();
        continue;
      }
      return null;
    }

    try {
      const name = chosenPath.split("/").pop() || chosenPath;
      const fileHandle = await getFileHandleByPath(
        chosenRecord.handle,
        chosenPath,
      );

      return {
        handle: fileHandle,
        name,
        relativePath: chosenPath,
        folderId: chosenRecord.id,
        folderName: chosenRecord.folderName,
      };
    } catch (error) {
      if (error instanceof LocalPermissionError) throw error;

      excludedSet.add(chosenPath);
    }
  }

  return null;
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
    ? records.find((r) => r.id === folderId)
    : records[0];

  if (!folderRecord) {
    throw new Error("Target folder not found.");
  }

  const fileHandle = await getFileHandleByPath(
    folderRecord.handle,
    relativePath,
  );

  return fileHandle.getFile();
}
