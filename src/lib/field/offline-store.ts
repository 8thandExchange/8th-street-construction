import type { OfflineCapture, OfflineCaptureStatus } from "./offline-queue";

export type HeldPhoto = {
  id: string;
  blob: Blob;
  name: string;
  type: string;
};

export type OfflineStore = {
  list(): Promise<OfflineCapture[]>;
  put(capture: OfflineCapture, photos?: HeldPhoto[]): Promise<void>;
  remove(id: string): Promise<void>;
  getPhoto(id: string): Promise<HeldPhoto | null>;
  mark(id: string, status: OfflineCaptureStatus, lastError?: string): Promise<void>;
};

const DB_NAME = "8th-street-field";
const DB_VERSION = 1;
const QUEUE_EVENT = "field-offline-queue-changed";

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function subscribeOfflineQueue(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(QUEUE_EVENT, listener);
  return () => window.removeEventListener(QUEUE_EVENT, listener);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser cannot save offline captures."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("captures")) {
        db.createObjectStore("captures", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("photos")) {
        db.createObjectStore("photos", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the offline store."));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createIndexedDbStore(): OfflineStore {
  return {
    async list() {
      const db = await openDb();
      try {
        const rows = await requestToPromise(
          db.transaction("captures", "readonly").objectStore("captures").getAll()
        );
        return (rows as OfflineCapture[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      } finally {
        db.close();
      }
    },

    async put(capture, photos = []) {
      const db = await openDb();
      try {
        const tx = db.transaction(["captures", "photos"], "readwrite");
        tx.objectStore("captures").put(capture);
        for (const photo of photos) {
          tx.objectStore("photos").put(photo);
        }
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
      notify();
    },

    async remove(id) {
      const db = await openDb();
      try {
        const capture = (await requestToPromise(
          db.transaction("captures", "readonly").objectStore("captures").get(id)
        )) as OfflineCapture | undefined;
        const tx = db.transaction(["captures", "photos"], "readwrite");
        tx.objectStore("captures").delete(id);
        for (const photoId of capture?.photoIds ?? []) {
          tx.objectStore("photos").delete(photoId);
        }
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
      notify();
    },

    async getPhoto(id) {
      const db = await openDb();
      try {
        const row = await requestToPromise(
          db.transaction("photos", "readonly").objectStore("photos").get(id)
        );
        return (row as HeldPhoto | undefined) ?? null;
      } finally {
        db.close();
      }
    },

    async mark(id, status, lastError) {
      const db = await openDb();
      try {
        const store = db.transaction("captures", "readwrite").objectStore("captures");
        const current = (await requestToPromise(store.get(id))) as OfflineCapture | undefined;
        if (!current) return;
        current.status = status;
        current.lastError = lastError;
        store.put(current);
      } finally {
        db.close();
      }
      notify();
    },
  };
}

export function createMemoryStore(seed: OfflineCapture[] = [], photos: HeldPhoto[] = []): OfflineStore {
  const captures = new Map(seed.map((item) => [item.id, { ...item }]));
  const blobs = new Map(photos.map((photo) => [photo.id, photo]));
  return {
    async list() {
      return [...captures.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async put(capture, nextPhotos = []) {
      captures.set(capture.id, { ...capture });
      for (const photo of nextPhotos) blobs.set(photo.id, photo);
    },
    async remove(id) {
      const current = captures.get(id);
      captures.delete(id);
      for (const photoId of current?.photoIds ?? []) blobs.delete(photoId);
    },
    async getPhoto(id) {
      return blobs.get(id) ?? null;
    },
    async mark(id, status, lastError) {
      const current = captures.get(id);
      if (!current) return;
      captures.set(id, { ...current, status, lastError });
    },
  };
}
