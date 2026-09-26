"use client";

import { useState } from "react";
import { useInventoryStore, InventoryItem } from "@/lib/store/useInventoryStore";
import { usePosStore } from "@/lib/store/usePosStore";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";
import {
  X,
  Save,
  Package,
} from "lucide-react";

interface ProductFormModalProps {
  mode: "add" | "edit";
  editItem?: InventoryItem;
  onClose: () => void;
}

const VERTICAL_CATEGORIES: Record<string, string[]> = {
  bakery: ["Cakes", "Pastries & Breads", "Breads", "Desserts", "Biscuits & Cookies", "Beverages", "Other"],
  restaurant: ["Main Course", "Starters / Appetizers", "Beverages", "Desserts", "Sides & Extras", "Other"],
  cafe: ["Beverages", "Hot Drinks", "Cold Drinks", "Snacks & Sandwiches", "Pastries", "Desserts", "Other"],
  pharmacy: ["Medicines", "Vitamins & Supplements", "Medical Devices", "Personal Care", "Baby Care", "Other"],
  retail: ["General", "Electronics", "Clothing", "Footwear", "Accessories", "Home & Kitchen", "Other"],
  supermarket: ["Groceries", "Dairy & Eggs", "Bakery", "Beverages", "Frozen Foods", "Snacks", "Other"],
  electronics: ["Mobile Phones", "Accessories", "Laptops", "Audio", "Cables & Adapters", "Other"],
  clothing: ["Men's Wear", "Women's Wear", "Kids Wear", "Footwear", "Accessories", "Other"],
  salon: ["Hair Services", "Skin Services", "Nail Services", "Makeup", "Packages", "Other"],
};

export function ProductFormModal({ mode, editItem, onClose }: ProductFormModalProps) {
  const { addItem, updateItem } = useInventoryStore();
  const { currentVertical } = usePosStore();
  const config = VERTICAL_CONFIGS[currentVertical];
  const categories = VERTICAL_CATEGORIES[currentVertical] || ["General", "Other"];

  const [form, setForm] = useState<Omit<InventoryItem, "id">>({
    sku: editItem?.sku || "",
    name: editItem?.name || "",
    category: editItem?.category || categories[0],
    price: editItem?.price || 0,
    costPrice: editItem?.costPrice || 0,
    stock: editItem?.stock || 0,
    unit: editItem?.unit || "Pcs",
    batchNumber: editItem?.batchNumber || "",
    expiryDate: editItem?.expiryDate || "",
    genericName: editItem?.genericName || "",
    serialNumber: editItem?.serialNumber || "",
    warrantyMonths: editItem?.warrantyMonths || 0,
    size: editItem?.size || "",
    color: editItem?.color || "",
    preparationTime: editItem?.preparationTime || 0,
    flavour: editItem?.flavour || "",
    weightGrams: editItem?.weightGrams || 0,
    expiryTime: editItem?.expiryTime || "",
    isPerishable: editItem?.isPerishable || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function set(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.sku.trim()) newErrors.sku = "SKU is required";
    if (!form.name.trim()) newErrors.name = "Product name is required";
    if (form.price <= 0) newErrors.price = "Price must be greater than 0";
    if (form.stock < 0) newErrors.stock = "Stock cannot be negative";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setSaveError("");
    const result = mode === "add" ? await addItem(form) : editItem ? await updateItem(editItem.id, form) : { ok: true as const };
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#171719] border border-[rgba(255,255,255,0.12)] w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#819ffe]" />
            <h3 className="font-accent font-extrabold text-[1.5rem] uppercase text-white">
              {mode === "add" ? `Add New ${config.terminology.item || "Product"}` : `Edit ${config.terminology.item || "Product"}`}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-5 text-white max-h-[75vh] overflow-y-auto">

          {/* Vertical Badge */}
          <div className="flex items-center gap-2 bg-[#002bba]/20 border border-[#002bba]/40 px-3 py-2">
            <span className="font-accent text-[1.1rem] text-blue-300 uppercase font-bold">
              Active Vertical: {config.title}
            </span>
          </div>

          {/* Row 1: SKU + Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label text-[rgba(255,255,255,0.6)]">SKU Code *</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => set("sku", e.target.value)}
                placeholder="e.g. BAK-101"
                className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba] uppercase"
              />
              {errors.sku && <p className="text-red-400 text-[1.1rem] mt-1">{errors.sku}</p>}
            </div>
            <div>
              <label className="form-label text-[rgba(255,255,255,0.6)]">Category</label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba] appearance-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0b0b0d]">{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="form-label text-[rgba(255,255,255,0.6)]">Product / Item Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={`e.g. ${config.terminology.item || "Product Name"}`}
              className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba]"
            />
            {errors.name && <p className="text-red-400 text-[1.1rem] mt-1">{errors.name}</p>}
          </div>

          {/* Row 2: Price + Cost + Stock + Unit */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="form-label text-[rgba(255,255,255,0.6)]">Sale Price (PKR) *</label>
              <input
                type="number"
                value={form.price || ""}
                onChange={(e) => set("price", Number(e.target.value))}
                className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba]"
              />
              {errors.price && <p className="text-red-400 text-[1.1rem] mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="form-label text-[rgba(255,255,255,0.6)]">Cost Price (PKR)</label>
              <input
                type="number"
                value={form.costPrice || ""}
                onChange={(e) => set("costPrice", Number(e.target.value))}
                className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba]"
              />
            </div>
            <div>
              <label className="form-label text-[rgba(255,255,255,0.6)]">Opening Stock</label>
              <input
                type="number"
                value={form.stock || ""}
                onChange={(e) => set("stock", Number(e.target.value))}
                className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba]"
              />
            </div>
            <div>
              <label className="form-label text-[rgba(255,255,255,0.6)]">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => set("unit", e.target.value)}
                className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-[#002bba] appearance-none"
              >
                {["Pcs", "KG", "Gram", "Box", "Bottle", "Cup", "Bowl", "Litre", "Pack", "Set"].map((u) => (
                  <option key={u} value={u} className="bg-[#0b0b0d]">{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ─── VERTICAL SPECIFIC FIELDS ─── */}

          {/* Bakery Fields */}
          {currentVertical === "bakery" && (
            <div className="space-y-4 border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="font-accent text-[1.2rem] text-amber-400 uppercase font-bold">🥐 Bakery Specific Fields</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Flavour / Filling</label>
                  <input type="text" value={form.flavour || ""} onChange={(e) => set("flavour", e.target.value)} placeholder="e.g. Chocolate, Vanilla" className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Weight (Grams)</label>
                  <input type="number" value={form.weightGrams || ""} onChange={(e) => set("weightGrams", Number(e.target.value))} placeholder="e.g. 900" className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Best Before / Expiry Time</label>
                  <select value={form.expiryTime || ""} onChange={(e) => set("expiryTime", e.target.value)} className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-amber-500 appearance-none">
                    <option value="" className="bg-[#0b0b0d]">Select Expiry</option>
                    {["6 Hours", "12 Hours", "24 Hours", "36 Hours", "48 Hours", "3 Days", "5 Days", "7 Days", "1 Month"].map((t) => (
                      <option key={t} value={t} className="bg-[#0b0b0d]">{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input type="checkbox" id="isPerishable" checked={form.isPerishable || false} onChange={(e) => set("isPerishable", e.target.checked)} className="w-5 h-5 accent-amber-500 cursor-pointer" />
                  <label htmlFor="isPerishable" className="font-accent text-[1.2rem] text-amber-300 cursor-pointer">Perishable Item (Fresh)</label>
                </div>
              </div>
            </div>
          )}

          {/* Restaurant / Cafe Fields */}
          {(currentVertical === "restaurant" || currentVertical === "cafe") && (
            <div className="space-y-4 border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="font-accent text-[1.2rem] text-emerald-400 uppercase font-bold">
                {currentVertical === "restaurant" ? "🍽️ Restaurant" : "☕ Cafe"} Specific Fields
              </p>
              <div>
                <label className="form-label text-[rgba(255,255,255,0.6)]">Preparation Time (Minutes)</label>
                <input type="number" value={form.preparationTime || ""} onChange={(e) => set("preparationTime", Number(e.target.value))} placeholder="e.g. 15" className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-emerald-500" />
              </div>
            </div>
          )}

          {/* Pharmacy Fields */}
          {currentVertical === "pharmacy" && (
            <div className="space-y-4 border border-rose-500/30 bg-rose-500/5 p-4">
              <p className="font-accent text-[1.2rem] text-rose-400 uppercase font-bold">💊 Pharmacy / Medicine Fields</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Batch Number</label>
                  <input type="text" value={form.batchNumber || ""} onChange={(e) => set("batchNumber", e.target.value)} placeholder="e.g. BCH-9921" className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-rose-500" />
                </div>
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Expiry Date</label>
                  <input type="date" value={form.expiryDate || ""} onChange={(e) => set("expiryDate", e.target.value)} className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-rose-500" />
                </div>
                <div className="col-span-2">
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Generic Name / Molecule</label>
                  <input type="text" value={form.genericName || ""} onChange={(e) => set("genericName", e.target.value)} placeholder="e.g. Acetaminophen, Amoxicillin" className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-rose-500" />
                </div>
              </div>
            </div>
          )}

          {/* Electronics Fields */}
          {currentVertical === "electronics" && (
            <div className="space-y-4 border border-purple-500/30 bg-purple-500/5 p-4">
              <p className="font-accent text-[1.2rem] text-purple-400 uppercase font-bold">📱 Electronics Fields</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Serial Number / IMEI</label>
                  <input type="text" value={form.serialNumber || ""} onChange={(e) => set("serialNumber", e.target.value)} placeholder="e.g. SN-9948271" className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Warranty (Months)</label>
                  <input type="number" value={form.warrantyMonths || ""} onChange={(e) => set("warrantyMonths", Number(e.target.value))} placeholder="e.g. 12" className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-purple-500" />
                </div>
              </div>
            </div>
          )}

          {/* Clothing Fields */}
          {currentVertical === "clothing" && (
            <div className="space-y-4 border border-pink-500/30 bg-pink-500/5 p-4">
              <p className="font-accent text-[1.2rem] text-pink-400 uppercase font-bold">👗 Clothing / Fashion Fields</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Size</label>
                  <select value={form.size || ""} onChange={(e) => set("size", e.target.value)} className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-pink-500 appearance-none">
                    <option value="" className="bg-[#0b0b0d]">Select Size</option>
                    {["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size", "26", "28", "30", "32", "34", "36"].map((s) => (
                      <option key={s} value={s} className="bg-[#0b0b0d]">{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label text-[rgba(255,255,255,0.6)]">Color</label>
                  <input type="text" value={form.color || ""} onChange={(e) => set("color", e.target.value)} placeholder="e.g. Navy Blue, Black, Red" className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-pink-500" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {saveError && (
          <div className="mx-5 mb-0 mt-3 bg-red-500/15 border border-red-500/30 text-red-400 px-3 py-2 text-[1.2rem]">
            {saveError}
          </div>
        )}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[rgba(255,255,255,0.08)]">
          <button onClick={onClose} className="btn btn-secondary py-2.5 px-6 text-[1.3rem] bg-[#0b0b0d] border-[rgba(255,255,255,0.15)] text-white">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary py-2.5 px-8 text-[1.3rem] disabled:opacity-50">
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : mode === "add" ? "Save Product" : "Update Product"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
