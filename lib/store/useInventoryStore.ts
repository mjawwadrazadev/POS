import { create } from "zustand";

export interface InventoryItem {
  id: string;
  sku: string;
  barcode?: string;
  hsCode?: string; // FBR HS / PCT code
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  unit: string;
  // Pharmacy
  batchNumber?: string;
  expiryDate?: string;
  genericName?: string;
  // Electronics
  serialNumber?: string;
  warrantyMonths?: number;
  // Clothing
  size?: string;
  color?: string;
  // Restaurant / Cafe
  preparationTime?: number;
  // Bakery
  flavour?: string;
  weightGrams?: number;
  expiryTime?: string;
  isPerishable?: boolean;
}

export type MutationResult = { ok: true } | { ok: false; error: string };

interface InventoryState {
  items: InventoryItem[];
  fetchFromApi: () => Promise<void>;
  // Persisted to the database through /api/products — the local list only changes on success
  addItem: (item: Omit<InventoryItem, "id">) => Promise<MutationResult>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<MutationResult>;
  deleteItem: (id: string) => Promise<MutationResult>;
  adjustStockOnServer: (id: string, delta: number, reason?: string) => Promise<MutationResult>;
  // Local-only optimistic update used by the POS right after a server-confirmed sale
  adjustStock: (id: string, delta: number) => void;
}

function toInventoryItem(p: any): InventoryItem {
  return {
    id: p._id,
    sku: p.sku || "",
    barcode: p.barcode,
    hsCode: p.hsCode,
    name: p.name,
    category: p.category || "General",
    price: p.price || 0,
    costPrice: p.costPrice || 0,
    stock: p.stock || 0,
    unit: p.unit || "Pcs",
    batchNumber: p.batchNumber,
    expiryDate: p.expiryDate ? String(p.expiryDate).slice(0, 10) : undefined,
    genericName: p.genericName,
    serialNumber: p.serialNumber,
    warrantyMonths: p.warrantyMonths,
    size: p.size,
    color: p.color,
    preparationTime: p.preparationTime,
    flavour: p.flavour,
    weightGrams: p.weightGrams,
    expiryTime: p.expiryTime,
    isPerishable: p.isPerishable,
  };
}

async function callApi(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: any }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.success !== false, data };
  } catch {
    return { ok: false, data: { error: "Network error — check your connection" } };
  }
}

export const useInventoryStore = create<InventoryState>((set) => ({
  items: [], // Completely clean by default — 0 dummy products

  fetchFromApi: async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        set({ items: data.products.map(toInventoryItem) });
      } else {
        set({ items: [] });
      }
    } catch (e) {
      console.error("Failed to fetch inventory products from API:", e);
      set({ items: [] });
    }
  },

  addItem: async (item) => {
    const { ok, data } = await callApi("/api/products", "POST", item);
    if (!ok) return { ok: false, error: data.error || "Failed to save product" };
    set((state) => ({ items: [toInventoryItem(data.product), ...state.items] }));
    return { ok: true };
  },

  updateItem: async (id, updates) => {
    // Stock is never overwritten from an edit form — use adjustStockOnServer instead
    const { stock: _ignored, ...fields } = updates;
    const { ok, data } = await callApi(`/api/products/${id}`, "PATCH", fields);
    if (!ok) return { ok: false, error: data.error || "Failed to update product" };
    set((state) => ({ items: state.items.map((i) => (i.id === id ? toInventoryItem(data.product) : i)) }));
    return { ok: true };
  },

  deleteItem: async (id) => {
    const { ok, data } = await callApi(`/api/products/${id}`, "DELETE");
    if (!ok) return { ok: false, error: data.error || "Failed to delete product" };
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    return { ok: true };
  },

  adjustStockOnServer: async (id, delta, reason) => {
    const { ok, data } = await callApi(`/api/products/${id}`, "PATCH", { stockAdjustment: delta, reason });
    if (!ok) return { ok: false, error: data.error || "Failed to adjust stock" };
    set((state) => ({ items: state.items.map((i) => (i.id === id ? toInventoryItem(data.product) : i)) }));
    return { ok: true };
  },

  adjustStock: (id, delta) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item
      ),
    })),
}));
