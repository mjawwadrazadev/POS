"use client";

import { useState } from "react";
import { usePosStore } from "@/lib/store/usePosStore";
import { useInventoryStore } from "@/lib/store/useInventoryStore";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";
import { ThermalReceiptModal } from "@/components/pos/ThermalReceiptModal";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  PauseCircle,
  Barcode,
  Cake,
  Utensils,
  Pill,
  AlertTriangle,
  X,
  ShieldCheck,
  Key,
} from "lucide-react";

type PaymentMethod = "cash" | "card" | "wallet";

export default function PosBillingPage() {
  const {
    currentVertical,
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTaxTotal,
    getDiscountTotal,
    getGrandTotal,
    orderType,
    setOrderType,
    selectedTable,
    setSelectedTable,
    discountGlobalPercent,
    setDiscount,
    shiftCashier,
    selectedBranch,
  } = usePosStore();

  const { items: inventoryItems, adjustStock } = useInventoryStore();
  const config = VERTICAL_CONFIGS[currentVertical];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState("");
  const [stockError, setStockError] = useState("");

  // Manager PIN Override State
  const [pendingDiscountVal, setPendingDiscountVal] = useState<number | null>(null);
  const [managerPin, setManagerPin] = useState("");
  const [managerPinError, setManagerPinError] = useState("");
  const [isManagerAuthorized, setIsManagerAuthorized] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Get distinct categories from inventory
  const allCategories = ["All", ...Array.from(new Set(inventoryItems.map((i) => i.category)))];

  const filteredProducts = inventoryItems.filter((p) =>
    (selectedCategory === "All" || p.category === selectedCategory) &&
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  function handleAddToCart(product: typeof inventoryItems[0]) {
    if (product.stock <= 0) {
      setStockError(`"${product.name}" is out of stock!`);
      setTimeout(() => setStockError(""), 3000);
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      batchNumber: product.batchNumber,
      serialNumber: product.serialNumber,
    });
  }

  function handleDiscountChange(val: number) {
    if (val > 10 && !isManagerAuthorized) {
      setPendingDiscountVal(val);
      setManagerPin("");
      setManagerPinError("");
      return;
    }
    setDiscount(val);
  }

  async function handleVerifyManagerPin() {
    setVerifyingPin(true);
    setManagerPinError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: managerPin }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error("Invalid Manager PIN");
      }

      if (data.user.role === "cashier") {
        throw new Error("Cashier PIN entered. Manager or Admin PIN required for > 10% discount override.");
      }

      // Authorization success
      setIsManagerAuthorized(true);
      if (pendingDiscountVal !== null) {
        setDiscount(pendingDiscountVal);
      }
      setPendingDiscountVal(null);
    } catch (err: any) {
      setManagerPinError(err.message || "Invalid Manager PIN");
    } finally {
      setVerifyingPin(false);
    }
  }

  function handleCompleteCheckout() {
    if (cart.length === 0) return;

    // Deduct stock for each item
    cart.forEach((cartItem) => {
      adjustStock(cartItem.id, -cartItem.quantity);
    });

    const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
    setLastOrderNumber(orderNum);
    setShowReceipt(true);
    clearCart();
    setCustomerName("Walk-in Customer");
  }

  const subtotal = getSubtotal();
  const taxAmount = getTaxTotal();
  const discountTotal = getDiscountTotal();
  const grandTotal = getGrandTotal();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ height: "calc(100vh - 13rem)" }}>

        {/* LEFT — Product Catalogue (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden">

          {/* Search + Barcode */}
          <div className="bg-base-tint border border-stroke-muted p-3 flex gap-3">
            <div className="flex-1 flex items-center gap-2 bg-base-bright border border-stroke-muted px-3 py-2">
              <Search className="w-4 h-4 text-muted flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${config.terminology.item || "product"} by name or SKU...`}
                className="w-full bg-transparent text-[1.4rem] outline-none text-bright font-sans"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X className="w-4 h-4 text-muted hover:text-error" />
                </button>
              )}
            </div>
            <button type="button" className="btn btn-secondary py-2 px-4">
              <Barcode className="w-5 h-5 text-accent" />
              <span className="font-accent text-[1.2rem] hidden sm:inline">Scan</span>
            </button>
          </div>

          {/* Stock error banner */}
          {stockError && (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-400 px-4 py-2.5 font-accent text-[1.2rem]">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{stockError}</span>
            </div>
          )}

          {/* Order Type + Table Selector */}
          <div className="bg-base-tint border border-stroke-muted p-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 font-accent text-[1.2rem]">
              <span className="text-muted font-semibold">Type:</span>
              {(["retail_sale", "dine_in", "takeaway", "prescription"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrderType(type)}
                  className={`px-3 py-1 text-[1.1rem] font-bold uppercase transition-colors ${
                    orderType === type
                      ? "bg-accent text-white"
                      : "bg-base-bright border border-stroke-muted text-bright hover:bg-accent-subtle"
                  }`}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>

            {(currentVertical === "restaurant" || orderType === "dine_in") && (
              <div className="flex items-center gap-2 font-accent text-[1.2rem] ml-auto">
                <span className="text-muted">Table:</span>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="bg-base-bright border border-stroke-muted px-2 py-1 text-[1.2rem] text-bright outline-none font-bold"
                >
                  {["Table 01","Table 02","Table 03","Table 04","Table 05","Table 06","Table 07","Table 08"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 flex-wrap">
            {allCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 font-accent text-[1.2rem] font-bold uppercase transition-colors ${
                  selectedCategory === cat
                    ? "bg-accent text-white"
                    : "bg-base-tint border border-stroke-muted text-medium hover:border-accent hover:text-bright"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1">
            {filteredProducts.length === 0 && (
              <div className="col-span-3 text-center py-12 text-muted font-accent text-[1.3rem]">
                No products found. Add products from Inventory page.
              </div>
            )}
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => handleAddToCart(p)}
                className={`bg-base-tint border flex flex-col justify-between p-4 transition-all group cursor-pointer ${
                  p.stock === 0
                    ? "border-red-500/30 opacity-50 cursor-not-allowed"
                    : "border-stroke-muted hover:border-accent hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-accent text-[1.1rem] text-accent font-bold">{p.sku}</span>
                    <span className={`font-accent text-[1rem] px-1.5 py-0.5 border ${p.stock < 10 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-muted border-stroke-muted bg-base-bright"}`}>
                      {p.stock === 0 ? "OUT" : `${p.stock} ${p.unit}`}
                    </span>
                  </div>
                  <h4 className="font-bold text-[1.35rem] text-bright line-clamp-2 group-hover:text-accent transition-colors">
                    {p.name}
                  </h4>
                  <div className="mt-1 text-[1.1rem] font-accent text-muted space-y-0.5">
                    {p.batchNumber && (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <Pill className="w-3 h-3" />
                        <span>Batch: {p.batchNumber}</span>
                      </div>
                    )}
                    {p.flavour && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Cake className="w-3 h-3" />
                        <span>{p.flavour}{p.weightGrams ? ` · ${p.weightGrams}g` : ""}</span>
                      </div>
                    )}
                    {p.preparationTime && (
                      <div className="flex items-center gap-1 text-emerald-500">
                        <Utensils className="w-3 h-3" />
                        <span>Prep: {p.preparationTime}m</span>
                      </div>
                    )}
                    {p.expiryTime && (
                      <span className="text-amber-500">Best Before: {p.expiryTime}</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-stroke-muted flex items-center justify-between">
                  <span className="font-accent text-[1.6rem] font-extrabold text-bright">
                    PKR {p.price.toLocaleString()}
                  </span>
                  <div className="bg-accent text-white p-1.5 group-hover:bg-accent-hover transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Cart & Checkout (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-base-tint border border-stroke-muted overflow-hidden">

          {/* Cart Header */}
          <div className="p-4 border-b border-stroke-muted flex items-center justify-between bg-base-bright flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-accent" />
              <h3 className="font-accent font-bold text-[1.4rem] uppercase text-bright">
                Billing Cart
              </h3>
              {cart.length > 0 && (
                <span className="badge badge-accent font-accent">{cart.length}</span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-error font-accent text-[1.1rem] hover:underline flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Customer Name */}
          <div className="px-4 py-2.5 border-b border-stroke-muted bg-base-bright flex-shrink-0">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name (optional)"
              className="w-full bg-base-tint border border-stroke-muted text-bright text-[1.3rem] px-3 py-2 outline-none focus:border-accent font-sans"
            />
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted gap-3 py-10">
                <ShoppingCart className="w-12 h-12 stroke-[1.5] text-stroke-muted" />
                <p className="font-accent text-[1.3rem] uppercase">Cart is Empty</p>
                <p className="text-[1.2rem] text-center">Click products on the left to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="bg-base-bright border border-stroke-muted p-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[1.3rem] text-bright truncate">{item.name}</div>
                    <div className="font-accent text-[1.1rem] text-muted">
                      {item.sku} · PKR {item.price.toLocaleString()} ea
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-base-tint border border-stroke-muted px-2 py-1 flex-shrink-0">
                    <button onClick={() => updateQuantity(item.id, -1)} className="text-bright hover:text-accent">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-accent font-bold text-[1.3rem] w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="text-bright hover:text-accent">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-accent font-bold text-[1.4rem] text-bright">
                      PKR {(item.price * item.quantity - item.discount).toLocaleString()}
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-error hover:opacity-80">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals + Discount + Payment */}
          <div className="p-4 border-t border-stroke-muted bg-base-bright space-y-3 flex-shrink-0">

            {/* Discount slider + Manager Authorization Status */}
            <div className="space-y-1">
              <div className="flex items-center justify-between font-accent text-[1.2rem]">
                <span className="text-muted flex items-center gap-1">
                  <span>Discount:</span>
                  {isManagerAuthorized && (
                    <span className="text-emerald-400 font-bold text-[1rem] bg-emerald-500/10 border border-emerald-500/30 px-1">
                      MANAGER AUTHORIZED
                    </span>
                  )}
                </span>
                <span className="font-bold text-accent">{discountGlobalPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={discountGlobalPercent}
                onChange={(e) => handleDiscountChange(Number(e.target.value))}
                className="w-full accent-accent cursor-pointer"
              />
            </div>

            {/* Totals */}
            <div className="space-y-1 font-accent text-[1.2rem]">
              <div className="flex justify-between text-muted">
                <span>Subtotal:</span>
                <span className="text-bright">PKR {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Sales Tax (16%):</span>
                <span className="text-bright">PKR {taxAmount.toLocaleString()}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Discount ({discountGlobalPercent}%):</span>
                  <span className="text-error font-bold">- PKR {discountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-[1.8rem] font-extrabold text-bright pt-2 border-t border-stroke-muted">
                <span>TOTAL:</span>
                <span className="text-accent">PKR {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-3 gap-2">
              {(["cash","card","wallet"] as const).map((method) => {
                const icons = { cash: <Banknote className="w-4 h-4" />, card: <CreditCard className="w-4 h-4" />, wallet: <QrCode className="w-4 h-4" /> };
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedPayment(method)}
                    className={`btn py-2 text-[1.1rem] flex items-center justify-center gap-1 transition-colors ${
                      selectedPayment === method
                        ? "btn-primary"
                        : "btn-secondary"
                    }`}
                  >
                    {icons[method]}
                    <span className="uppercase">{method}</span>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="btn btn-secondary py-3 text-[1.2rem]">
                <PauseCircle className="w-4 h-4" />
                <span>Hold Order</span>
              </button>
              <button
                type="button"
                onClick={handleCompleteCheckout}
                disabled={cart.length === 0}
                className="btn btn-primary py-3 text-[1.3rem] disabled:opacity-40"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Pay PKR {grandTotal.toLocaleString()}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MANAGER PIN OVERRIDE MODAL (For discounts > 10%) */}
      {pendingDiscountVal !== null && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4">
          <div className="bg-[#171719] border border-amber-500/50 w-full max-w-md p-6 text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-4">
              <div className="flex items-center gap-2 text-amber-400 font-accent font-extrabold text-[1.4rem] uppercase">
                <ShieldCheck className="w-5 h-5" />
                <span>Manager PIN Required</span>
              </div>
              <button onClick={() => setPendingDiscountVal(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[1.3rem] text-gray-300">
                Discounts higher than <b>10%</b> ({pendingDiscountVal}%) require Manager or Store Admin authorization.
              </p>
            </div>

            {managerPinError && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 p-3 text-[1.2rem] font-medium">
                {managerPinError}
              </div>
            )}

            <div>
              <label className="form-label text-gray-300">Enter Manager / Admin 4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-[#0b0b0d] border border-amber-500/40 text-amber-300 font-mono font-bold text-center text-[2.2rem] py-3 outline-none focus:border-amber-400"
              />
              <p className="text-[1.1rem] font-accent text-gray-400 mt-1">
                Manager PIN: 1234, 2222, 3333, or 9999
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingDiscountVal(null)}
                className="flex-1 btn btn-secondary py-3 text-[1.2rem] bg-[#0b0b0d] text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyManagerPin}
                disabled={managerPin.length !== 4 || verifyingPin}
                className="flex-1 btn btn-primary py-3 text-[1.2rem] bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50"
              >
                {verifyingPin ? "Verifying..." : "Authorize Discount"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal — opens automatically after payment */}
      <ThermalReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        orderNumber={lastOrderNumber}
        dateStr={new Date().toLocaleString("en-PK")}
        cashierName={shiftCashier}
        customerName={customerName}
        items={cart.map((c) => ({
          name: c.name,
          sku: c.sku,
          quantity: c.quantity,
          unitPrice: c.price,
          total: c.price * c.quantity - c.discount,
        }))}
        subtotal={subtotal}
        taxAmount={taxAmount}
        discountTotal={discountTotal}
        grandTotal={grandTotal}
        paymentMethod={selectedPayment}
        branchName={selectedBranch}
      />
    </>
  );
}
