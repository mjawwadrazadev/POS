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
  addItem: (item: Omit<InventoryItem, "id">) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
}

const defaultItems: InventoryItem[] = [
  {
    id: "bak-1",
    sku: "BAK-101",
    name: "Red Velvet Cream Fudge Cake (2 Pound)",
    category: "Cakes",
    price: 2400,
    costPrice: 1400,
    stock: 12,
    unit: "Pcs",
    flavour: "Red Velvet & Cocoa",
    weightGrams: 900,
    expiryTime: "48 Hours",
    isPerishable: true,
  },
  {
    id: "bak-2",
    sku: "BAK-102",
    name: "French Butter Croissant (Fresh Batch)",
    category: "Pastries & Breads",
    price: 320,
    costPrice: 180,
    stock: 45,
    unit: "Pcs",
    expiryTime: "24 Hours",
    isPerishable: true,
  },
  {
    id: "bak-3",
    sku: "BAK-103",
    name: "Pineapple Fresh Cream Pastry",
    category: "Pastries & Breads",
    price: 280,
    costPrice: 150,
    stock: 30,
    unit: "Pcs",
    expiryTime: "36 Hours",
    isPerishable: true,
  },
  {
    id: "bak-4",
    sku: "BAK-104",
    name: "Artisan Sourdough Garlic Bread",
    category: "Breads",
    price: 450,
    costPrice: 220,
    stock: 20,
    unit: "Pcs",
    expiryTime: "3 Days",
  },
  {
    id: "bak-5",
    sku: "BAK-105",
    name: "Belgian Dark Chocolate Mousse Cup",
    category: "Desserts",
    price: 490,
    costPrice: 280,
    stock: 8,
    unit: "Cup",
    expiryTime: "48 Hours",
    isPerishable: true,
  },
  {
    id: "rest-1",
    sku: "FD-101",
    name: "Chicken Karahi Special (1KG)",
    category: "Main Course",
    price: 1800,
    costPrice: 1200,
    stock: 50,
    unit: "KG",
    preparationTime: 25,
  },
  {
    id: "rest-2",
    sku: "FD-102",
    name: "Beef Nihari (Large)",
    category: "Main Course",
    price: 1400,
    costPrice: 900,
    stock: 30,
    unit: "Bowl",
    preparationTime: 40,
  },
  {
    id: "caf-1",
    sku: "BV-201",
    name: "Cold Brew Espresso Coffee",
    category: "Beverages",
    price: 650,
    costPrice: 350,
    stock: 90,
    unit: "Cup",
  },
  {
    id: "caf-2",
    sku: "BV-202",
    name: "Classic Cappuccino",
    category: "Beverages",
    price: 450,
    costPrice: 200,
    stock: 100,
    unit: "Cup",
  },
  {
    id: "med-1",
    sku: "MED-001",
    name: "Paracetamol 500mg Extra",
    category: "Medicines",
    price: 150,
    costPrice: 110,
    stock: 120,
    unit: "Pcs",
    batchNumber: "BCH-9921",
    expiryDate: "2027-08-15",
    genericName: "Acetaminophen",
  },
  {
    id: "ele-1",
    sku: "ELE-882",
    name: "Wireless Ergonomic Mouse",
    category: "Electronics",
    price: 2500,
    costPrice: 1800,
    stock: 18,
    unit: "Pcs",
    serialNumber: "SN-9948271",
    warrantyMonths: 12,
  },
  {
    id: "clo-1",
    sku: "CLO-303",
    name: "Slim Fit Cotton Denim Shirt",
    category: "Clothing",
    price: 3200,
    costPrice: 2100,
    stock: 25,
    unit: "Pcs",
    size: "L",
    color: "Navy Blue",
  },
];

export const useInventoryStore = create<InventoryState>((set) => ({
  items: defaultItems,

  addItem: (item) =>
    set((state) => ({
      items: [
        ...state.items,
        {
          ...item,
          id: `item-${Date.now()}`,
          sku: item.sku.toUpperCase(),
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
        item.id === id
          ? { ...item, stock: Math.max(0, item.stock + delta) }
          : item
      ),
    })),
}));
