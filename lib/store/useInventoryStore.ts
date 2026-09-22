import { create } from "zustand";

export interface InventoryItem {
  id: string;
  sku: string;
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

interface InventoryState {
  items: InventoryItem[];
  fetchFromApi: () => Promise<void>;
  addItem: (item: Omit<InventoryItem, "id">) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [], // Completely clean by default — 0 dummy products

  fetchFromApi: async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        set({
          items: data.products.map((p: any) => ({
            id: p._id,
            sku: p.sku || "",
            name: p.name,
            category: p.category || "General",
            price: p.price || 0,
            costPrice: p.costPrice || 0,
            stock: p.stock || 0,
            unit: p.unit || "Pcs",
            batchNumber: p.batchNumber,
            expiryDate: p.expiryDate,
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
          })),
        });
      } else {
        set({ items: [] });
      }
    } catch (e) {
      console.error("Failed to fetch inventory products from API:", e);
      set({ items: [] });
    }
  },

  addItem: (item) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          ...item,
          id: `prod-${Date.now()}`,
        },
      ],
    })),

  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),

  deleteItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  adjustStock: (id, delta) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item
      ),
    })),
}));
