// Listing metadata stays in localStorage. IndexedDB stores image blobs without
// Base64 inflation or localStorage's small synchronous string quota.
export type PhotoKind = "ganapati" | "decoration";
export type StoredPhoto = { name: string; blob: Blob };
export type PhotoSet = Record<PhotoKind, StoredPhoto[]>;
export type PhotoFiles = Record<PhotoKind, File[]>;
export const EMPTY_PHOTOS: PhotoSet = { ganapati: [], decoration: [] };
const DATABASE = "gnm-local-photos";
const STORE = "photo-sets";
const TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_STORAGE_ERROR =
  "Photos couldn’t be saved in this browser. Free some space or allow site storage, then try again. Your selected files are still here.";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      reject(new Error(PHOTO_STORAGE_ERROR));
    }, 8000);
    try {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => {
        clearTimeout(timer);
        if (expired) request.result.close();
        else resolve(request.result);
      };
      request.onerror = request.onblocked = () => {
        expired = true;
        clearTimeout(timer);
        reject(new Error(PHOTO_STORAGE_ERROR));
      };
    } catch {
      clearTimeout(timer);
      reject(new Error(PHOTO_STORAGE_ERROR));
    }
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = database.transaction(STORE, mode);
      const timer = setTimeout(() => {
        try {
          tx.abort();
        } catch {
          /* The transaction may have just finished. */
        }
        reject(new Error(PHOTO_STORAGE_ERROR));
      }, 10000);
      let request: IDBRequest<T>;
      try {
        request = operation(tx.objectStore(STORE));
      } catch {
        clearTimeout(timer);
        reject(new Error(PHOTO_STORAGE_ERROR));
        return;
      }
      tx.oncomplete = () => {
        clearTimeout(timer);
        resolve(request.result);
      };
      tx.onerror = tx.onabort = () => {
        clearTimeout(timer);
        reject(new Error(PHOTO_STORAGE_ERROR));
      };
    });
  } finally {
    database.close();
  }
}

function validGroup(value: unknown, max: number): value is StoredPhoto[] {
  return (
    Array.isArray(value) &&
    value.length <= max &&
    value.every(
      (photo) =>
        photo &&
        typeof photo.name === "string" &&
        photo.name.length <= 255 &&
        photo.blob instanceof Blob &&
        TYPES.includes(photo.blob.type) &&
        photo.blob.size > 0 &&
        photo.blob.size <= 5 * 1024 * 1024,
    )
  );
}

export function photosFromFiles(files: PhotoFiles): PhotoSet {
  return {
    ganapati: files.ganapati.map((file) => ({ name: file.name, blob: file })),
    decoration: files.decoration.map((file) => ({
      name: file.name,
      blob: file,
    })),
  };
}

export async function readPhotoSet(id?: string): Promise<PhotoSet | null> {
  if (!id) return null;
  const value: unknown = await transaction("readonly", (store) =>
    store.get(id),
  );
  if (value === undefined) return null;
  if (
    !value ||
    typeof value !== "object" ||
    !("ganapati" in value) ||
    !("decoration" in value) ||
    !validGroup(value.ganapati, 2) ||
    !validGroup(value.decoration, 3)
  ) {
    throw new Error(
      "Saved photos could not be read. Please attach them again.",
    );
  }
  return { ganapati: value.ganapati, decoration: value.decoration };
}

export async function storePhotoSet(
  photos: PhotoSet,
): Promise<string | undefined> {
  if (!validGroup(photos.ganapati, 2) || !validGroup(photos.decoration, 3)) {
    throw new Error(
      "Choose up to 2 Ganapati and 3 decoration photos, each a JPG, PNG or WebP under 5 MB.",
    );
  }
  if (!photos.ganapati.length && !photos.decoration.length) return undefined;
  const id = "photos-" + crypto.randomUUID();
  await transaction("readwrite", (store) => store.put(photos, id));
  return id;
}

export async function discardPhotoSet(id?: string) {
  if (id) await transaction("readwrite", (store) => store.delete(id));
}
