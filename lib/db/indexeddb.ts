// Offline IndexedDB order queue for RST POS.
// When the terminal loses connectivity, checkouts are queued here with a unique clientRef and
// replayed against /api/orders once the network is back. The server de-duplicates by clientRef,
// so a retry after a lost response can never create the same sale twice.

export interface OfflineOrder {
  id: string; // clientRef — idempotency key sent to the server
  payload: Record<string, any>;
  grandTotal: number;
  createdAt: string;
  failed?: boolean; // server rejected it (e.g. out of stock) — needs manual review
  lastError?: string;
}

const DB_NAME = "rst_pos_offline_db";
const DB_VERSION = 2;
const STORE_NAME = "pending_orders";

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(STORE_NAME)) db.deleteObjectStore(STORE_NAME);
      db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openOfflineDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const req = fn(tx.objectStore(STORE_NAME));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      })
  );
}

export function saveOfflineOrder(order: OfflineOrder): Promise<void> {
  return runTx<IDBValidKey>("readwrite", (s) => s.put(order)).then(() => undefined);
}

export function getPendingOfflineOrders(): Promise<OfflineOrder[]> {
  return runTx<OfflineOrder[]>("readonly", (s) => s.getAll());
}

export function deleteOfflineOrder(id: string): Promise<void> {
  return runTx<undefined>("readwrite", (s) => s.delete(id)).then(() => undefined);
}

export function newClientRef(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Network failure (no response at all) vs. a server-side rejection. */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (typeof navigator !== "undefined" && navigator.onLine === false);
}

/**
 * Replays queued orders. Returns how many were synced, and how many the server rejected
 * (those stay in the queue flagged `failed` so staff can review them).
 */
export async function syncOfflineOrders(): Promise<{ synced: number; failed: number; pending: number }> {
  let synced = 0;
  let failed = 0;
  let pending = 0;

  const queue = await getPendingOfflineOrders();
  for (const order of queue) {
    if (order.failed) {
      failed++;
      continue;
    }
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...order.payload, clientRef: order.id }),
      });

      if (res.ok) {
        await deleteOfflineOrder(order.id);
        synced++;
      } else if (res.status === 401 || res.status >= 500) {
        pending++; // session expired or server hiccup — retry later
      } else {
        const data = await res.json().catch(() => ({}));
        await saveOfflineOrder({ ...order, failed: true, lastError: data.error || `HTTP ${res.status}` });
        failed++;
      }
    } catch {
      pending++; // still offline
    }
  }

  return { synced, failed, pending };
}
