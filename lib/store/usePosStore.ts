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
  taxRate: number; // store sales-tax % from the organization settings

  // Actions
  setTaxRate: (rate: number) => void;
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
  selectedBranch: "Main Branch",
  activeShiftOpen: false,
  shiftCashier: "",
  cart: [],
  orderType: "retail_sale",
  selectedTable: "",
  discountGlobalPercent: 0,
  taxRate: 0,

  setTaxRate: (rate) => set({ taxRate: Number.isFinite(rate) ? rate : 0 }),
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
    return roundMoney(cart.reduce((sum, item) => sum + item.price * item.quantity - item.discount, 0));
  },

  // Mirrors the server calculation in /api/orders: tax is charged on the discounted amount
  getDiscountTotal: () => {
    const subtotal = get().getSubtotal();
    const { discountGlobalPercent } = get();
    return roundMoney(subtotal * (discountGlobalPercent / 100));
  },

  getTaxTotal: () => {
    const taxable = get().getSubtotal() - get().getDiscountTotal();
    return roundMoney(taxable * (get().taxRate / 100));
  },

  getGrandTotal: () => {
    const taxable = get().getSubtotal() - get().getDiscountTotal();
    return Math.max(0, roundMoney(taxable + get().getTaxTotal()));
  },
}));

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
