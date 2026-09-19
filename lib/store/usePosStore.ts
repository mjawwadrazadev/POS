import { create } from "zustand";
import { BusinessType, getVerticalConfig } from "@/lib/config/verticals";

export interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  discount: number;
  batchNumber?: string;
  expiryDate?: string;
  serialNumber?: string;
}

interface PosState {
  currentVertical: BusinessType;
  selectedBranch: string;
  activeShiftOpen: boolean;
  shiftCashier: string;
  cart: CartItem[];
  orderType: "dine_in" | "takeaway" | "delivery" | "retail_sale" | "prescription";
  selectedTable: string;
  discountGlobalPercent: number;

  // Actions
  setVertical: (type: BusinessType) => void;
  setBranch: (branch: string) => void;
  toggleShift: () => void;
  setOrderType: (type: PosState["orderType"]) => void;
  setSelectedTable: (table: string) => void;
  addToCart: (product: { id: string; name: string; sku: string; price: number; batchNumber?: string; serialNumber?: string }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  setDiscount: (percent: number) => void;

  // Computed totals
  getSubtotal: () => number;
  getTaxTotal: () => number;
  getDiscountTotal: () => number;
  getGrandTotal: () => number;
}

export const usePosStore = create<PosState>((set, get) => ({
  currentVertical: "bakery",
  selectedBranch: "Gulberg Main Bakery — Lahore (LHR-01)",
  activeShiftOpen: true,
  shiftCashier: "Ahmed Ali (Manager)",
  cart: [],
  orderType: "retail_sale",
  selectedTable: "Table 01",
  discountGlobalPercent: 0,

  setVertical: (type) => set({ currentVertical: type }),
  setBranch: (branch) => set({ selectedBranch: branch }),
  toggleShift: () => set((state) => ({ activeShiftOpen: !state.activeShiftOpen })),
  setOrderType: (type) => set({ orderType: type }),
  setSelectedTable: (table) => set({ selectedTable: table }),

  addToCart: (product) =>
    set((state) => {
      const existingIndex = state.cart.findIndex((item) => item.id === product.id);
      if (existingIndex > -1) {
        const updated = [...state.cart];
        updated[existingIndex].quantity += 1;
        return { cart: updated };
      }
      return {
        cart: [
          ...state.cart,
          {
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            quantity: 1,
            discount: 0,
            batchNumber: product.batchNumber,
            serialNumber: product.serialNumber,
          },
        ],
      };
    }),

  removeFromCart: (id) =>
    set((state) => ({ cart: state.cart.filter((item) => item.id !== id) })),

  updateQuantity: (id, delta) =>
    set((state) => ({
      cart: state.cart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    })),

  clearCart: () => set({ cart: [] }),
  setDiscount: (percent) => set({ discountGlobalPercent: percent }),

  getSubtotal: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + item.price * item.quantity - item.discount, 0);
  },

  getTaxTotal: () => {
    const subtotal = get().getSubtotal();
    return Math.round(subtotal * 0.16); // 16% sales tax
  },

  getDiscountTotal: () => {
    const subtotal = get().getSubtotal();
    const { discountGlobalPercent } = get();
    return Math.round(subtotal * (discountGlobalPercent / 100));
  },

  getGrandTotal: () => {
    const subtotal = get().getSubtotal();
    const tax = get().getTaxTotal();
    const discount = get().getDiscountTotal();
    return Math.max(0, subtotal + tax - discount);
  },
}));
