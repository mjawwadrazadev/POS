// Offline IndexedDB Transaction Storage Queue for RST POS

export interface OfflineOrder {
  id: string;
  orderNumber: string;
  items: any[];
  grandTotal: number;
  paymentMethod: string;
  createdAt: string;
  synced: boolean;
}

const DB_NAME = "rst_pos_offline_db";
const STORE_NAME = "pending_orders";

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineOrder(order: OfflineOrder): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(order);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingOfflineOrders(): Promise<OfflineOrder[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as OfflineOrder[]);
    req.onerror = () => reject(req.error);
  });
}
