"use client";

import { useState, useEffect } from "react";
import { useInventoryStore, InventoryItem } from "@/lib/store/useInventoryStore";
import { usePosStore } from "@/lib/store/usePosStore";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import { BarcodeLabelModal } from "@/components/products/BarcodeLabelModal";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Barcode,
  Pill,
  Tv,
  Cake,
  Utensils,
  Coffee,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  X,
} from "lucide-react";

export default function ProductsPage() {
  const { currentVertical } = usePosStore();
  const config = VERTICAL_CONFIGS[currentVertical];
  const { items, deleteItem, adjustStockOnServer, fetchFromApi } = useInventoryStore();

  useEffect(() => {
    fetchFromApi();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [barcodeItem, setBarcodeItem] = useState<InventoryItem | null>(null);
  const [stockAdjustId, setStockAdjustId] = useState<string | null>(null);
  const [stockDelta, setStockDelta] = useState(0);

  // Filter logic
  const allCategories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = items.filter((item) => {
    const matchSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.batchNumber || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === "All" || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const lowStockCount = items.filter((i) => i.stock < 10).length;

  async function handleDelete(id: string) {
    const result = await deleteItem(id);
    if (!result.ok) alert(result.error);
    setDeleteConfirmId(null);
  }

  async function handleStockAdjust(id: string) {
    if (stockDelta !== 0) {
      const result = await adjustStockOnServer(id, stockDelta, "Manual stock adjustment");
      if (!result.ok) {
        alert(result.error);
        return;
      }
    }
    setStockAdjustId(null);
    setStockDelta(0);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-tint border border-stroke-muted p-6">
        <div>
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-accent" />
            <h2 className="font-extrabold text-[2.2rem] text-bright">
              {config.title} — Inventory Management
            </h2>
            {lowStockCount > 0 && (
              <span className="badge badge-warning flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {lowStockCount} Low Stock
              </span>
            )}
          </div>
          <p className="text-medium text-[1.4rem] mt-1">
            Add, edit, delete and manage all {config.terminology.item || "products"} with real-time stock tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary py-3 px-6 text-[1.3rem]"
        >
          <Plus className="w-5 h-5" />
          <span>Add {config.terminology.item || "Product"}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-base-tint border border-stroke-muted p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[22rem] flex items-center gap-2 bg-base-bright border border-stroke-muted px-3 py-2">
          <Search className="w-4 h-4 text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${config.terminology.item || "product"} by name, SKU, batch...`}
            className="w-full bg-transparent text-[1.4rem] outline-none text-bright font-sans"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")}>
              <X className="w-4 h-4 text-muted hover:text-error" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Category Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-base-bright border border-stroke-muted text-bright px-3 py-2 text-[1.3rem] font-accent font-semibold outline-none appearance-none pr-8 cursor-pointer"
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <span className="font-accent text-[1.2rem] text-muted border border-stroke-muted px-3 py-2 bg-base-bright">
            {filtered.length} items
          </span>
        </div>
      </div>

      {/* Product Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Sale Price</th>
              <th>Cost Price</th>
              <th>Stock</th>
              <th>Adjust Stock</th>
              <th>Details</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted font-accent text-[1.3rem]">
                  No products found. Click "Add Product" to get started.
                </td>
              </tr>
            )}
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="font-accent font-bold text-accent">{item.sku}</td>
                <td className="font-bold text-bright max-w-[18rem]">
                  <span className="line-clamp-1">{item.name}</span>
                </td>
                <td className="font-accent text-medium">{item.category}</td>
                <td className="font-accent font-bold text-bright">PKR {item.price.toLocaleString()}</td>
                <td className="font-accent text-muted">PKR {item.costPrice.toLocaleString()}</td>
                <td>
                  <span className={`badge ${item.stock === 0 ? "badge-error" : item.stock < 10 ? "badge-warning" : "badge-success"}`}>
                    {item.stock} {item.unit}
                  </span>
                </td>

                {/* Inline Stock Adjust */}
                <td>
                  {stockAdjustId === item.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={stockDelta}
                        onChange={(e) => setStockDelta(Number(e.target.value))}
                        className="w-16 bg-base-bright border border-accent text-bright px-2 py-1 text-[1.2rem] outline-none font-accent font-bold"
                        placeholder="±0"
                        autoFocus
                      />
                      <button onClick={() => handleStockAdjust(item.id)} className="btn btn-primary py-1 px-2 text-[1.1rem]">✓</button>
                      <button onClick={() => { setStockAdjustId(null); setStockDelta(0); }} className="btn btn-secondary py-1 px-2 text-[1.1rem]">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setStockAdjustId(item.id)}
                      className="flex items-center gap-1 text-accent font-accent text-[1.2rem] hover:underline"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Adjust</span>
                    </button>
                  )}
                </td>

                {/* Vertical Attributes */}
                <td className="font-accent text-[1.15rem] text-muted max-w-[18rem]">
                  {item.batchNumber && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Pill className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">Batch: {item.batchNumber}{item.expiryDate ? ` (Exp: ${item.expiryDate})` : ""}</span>
                    </div>
                  )}
                  {item.serialNumber && (
                    <div className="flex items-center gap-1 text-purple-500">
                      <Tv className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">SN: {item.serialNumber}{item.warrantyMonths ? ` (${item.warrantyMonths}m)` : ""}</span>
                    </div>
                  )}
                  {item.flavour && (
                    <div className="flex items-center gap-1 text-amber-500">
                      <Cake className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.flavour}{item.weightGrams ? ` · ${item.weightGrams}g` : ""}{item.expiryTime ? ` · ${item.expiryTime}` : ""}</span>
                    </div>
                  )}
                  {item.preparationTime && (
                    <div className="flex items-center gap-1 text-emerald-500">
                      <Utensils className="w-3 h-3 flex-shrink-0" />
                      <span>Prep: {item.preparationTime} min</span>
                    </div>
                  )}
                  {item.size && (
                    <span className="text-pink-400">Size: {item.size} / {item.color}</span>
                  )}
                  {!item.batchNumber && !item.serialNumber && !item.flavour && !item.preparationTime && !item.size && (
                    <span className="text-stroke-medium">Standard</span>
                  )}
                </td>

                {/* Actions */}
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setBarcodeItem(item)}
                      className="p-1.5 text-muted hover:text-accent hover:bg-accent-subtle transition-colors"
                      title="Print Barcode Label"
                    >
                      <Barcode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditItem(item)}
                      className="p-1.5 text-muted hover:text-accent hover:bg-accent-subtle transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="p-1.5 text-muted hover:text-error hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirm Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#171719] border border-red-500/30 w-full max-w-sm p-6 text-white space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-accent font-bold text-[1.4rem] uppercase">Delete Product?</h3>
                <p className="text-[1.2rem] text-gray-400 mt-1">
                  "{items.find((i) => i.id === deleteConfirmId)?.name}"<br />
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 btn btn-secondary py-3 bg-[#0b0b0d] border-[rgba(255,255,255,0.15)] text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 btn btn-danger py-3"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <ProductFormModal mode="add" onClose={() => setShowAddModal(false)} />
      )}
      {editItem && (
        <ProductFormModal mode="edit" editItem={editItem} onClose={() => setEditItem(null)} />
      )}
      {barcodeItem && (
        <BarcodeLabelModal
          isOpen={true}
          onClose={() => setBarcodeItem(null)}
          productName={barcodeItem.name}
          sku={barcodeItem.sku}
          barcode={barcodeItem.barcode || barcodeItem.sku}
          price={barcodeItem.price}
          weightGrams={barcodeItem.weightGrams}
          expiryTime={barcodeItem.expiryTime}
        />
      )}
    </div>
  );
}
