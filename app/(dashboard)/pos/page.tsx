"use client";

import { useState, useEffect } from "react";
import { usePosStore } from "@/lib/store/usePosStore";
import { useInventoryStore } from "@/lib/store/useInventoryStore";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";
import { ThermalReceiptModal } from "@/components/pos/ThermalReceiptModal";
import { BarcodeScannerListener } from "@/components/pos/BarcodeScannerListener";
import { CameraBarcodeScannerModal } from "@/components/pos/CameraBarcodeScannerModal";
import { playScanSuccessBeep, playScanErrorBeep } from "@/lib/audio/scanBeep";
import {
  saveOfflineOrder,
  syncOfflineOrders,
  getPendingOfflineOrders,
  newClientRef,
  isNetworkError,
} from "@/lib/db/indexeddb";
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
  Split,
  Lock,
  Unlock,
  DollarSign,
  Printer,
  LayoutGrid,
  Camera,
} from "lucide-react";

type PaymentMethod = "cash" | "card" | "wallet" | "split";

interface CounterSessionData {
  _id: string;
  openingFloat: number;
  openedAt: string;
  cashSalesTotal: number;
  expectedCashInDrawer: number;
  orderCount: number;
}

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
    taxRate,
    setTaxRate,
  } = usePosStore();

  const { items: inventoryItems, adjustStock, fetchFromApi } = useInventoryStore();
  const config = VERTICAL_CONFIGS[currentVertical];

  useEffect(() => {
    fetchFromApi();
  }, []);

  // Session context (tax rate, role, names) + restaurant tables + offline queue sync
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [branchLabel, setBranchLabel] = useState<string>("");
  const [tableOptions, setTableOptions] = useState<string[]>([]);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [offlineNotice, setOfflineNotice] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated) return;
        setTaxRate(Number(d.user.taxRate) || 0);
        setUserRole(d.user.role);
        setUserName(d.user.fullName || d.user.name || d.user.email);
        setBranchLabel(d.user.branchName || d.user.organizationName || "");
      })
      .catch(() => {});

    fetch("/api/tables")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.tables)) {
          const labels = d.tables.map((t: any) => t.label);
          setTableOptions(labels);
          if (labels.length > 0 && !selectedTable) setSelectedTable(labels[0]);
        }
      })
      .catch(() => {});

    async function runSync() {
      try {
        const result = await syncOfflineOrders();
        const queue = await getPendingOfflineOrders();
        setOfflineQueueCount(queue.length);
        if (result.synced > 0) {
          setOfflineNotice(`${result.synced} offline sale(s) synced to the server.`);
          fetchFromApi();
        }
        if (result.failed > 0) {
          setOfflineNotice(`${result.failed} offline sale(s) were rejected by the server and need review.`);
        }
      } catch {
        // IndexedDB unavailable — offline mode disabled on this browser
      }
    }
    runSync();
    window.addEventListener("online", runSync);
    return () => window.removeEventListener("online", runSync);
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState("");
  // Server-confirmed order shown on the receipt (the cart is cleared right after checkout)
  const [lastOrder, setLastOrder] = useState<any | null>(null);
  const [stockError, setStockError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Split Payment State
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitWallet, setSplitWallet] = useState<number>(0);
  const [splitError, setSplitError] = useState("");

  // Manager PIN Override State
  const [pendingDiscountVal, setPendingDiscountVal] = useState<number | null>(null);
  const [managerPin, setManagerPin] = useState("");
  const [managerPinError, setManagerPinError] = useState("");
  const [isManagerAuthorized, setIsManagerAuthorized] = useState(false);
  const [overrideToken, setOverrideToken] = useState<string>("");
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Counter Session (EOD Shift Float) State
  const [activeSession, setActiveSession] = useState<CounterSessionData | null>(null);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState<number>(5000);
  const [actualCashInput, setActualCashInput] = useState<number>(0);
  const [shiftNotes, setShiftNotes] = useState("");
  const [eodSummaryReport, setEodSummaryReport] = useState<any | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [isFloorPlanOpen, setIsFloorPlanOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const subtotal = getSubtotal();
  const taxAmount = getTaxTotal();
  const discountTotal = getDiscountTotal();
  const grandTotal = getGrandTotal();

  function handleBarcodeScanned(barcode: string) {
    const match = inventoryItems.find(
      (p) =>
        ((p as any).barcode && (p as any).barcode.toLowerCase() === barcode.toLowerCase()) ||
        p.sku.toLowerCase() === barcode.toLowerCase()
    );
    if (match) {
      playScanSuccessBeep();
      handleAddToCart(match);
    } else {
      playScanErrorBeep();
      setStockError(`Scanned barcode "${barcode}" not found in inventory.`);
      setTimeout(() => setStockError(""), 4000);
    }
  }

  // Get distinct categories from inventory
  const allCategories = ["All", ...Array.from(new Set(inventoryItems.map((i) => i.category)))];

  const filteredProducts = inventoryItems.filter((p) =>
    (selectedCategory === "All" || p.category === selectedCategory) &&
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    fetchActiveCounterSession();
  }, []);

  const fetchActiveCounterSession = async () => {
    try {
      const res = await fetch("/api/counter-session");
      const data = await res.json();
      if (data.success && data.activeSession) {
        setActiveSession(data.activeSession);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Failed to fetch active counter session", err);
    }
  };

  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionLoading(true);
    try {
      const res = await fetch("/api/counter-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open",
          openingFloat: openingFloatInput,
          cashierName: userName,
          notes: shiftNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open shift");

      setIsOpenShiftModalOpen(false);
      setShiftNotes("");
      fetchActiveCounterSession();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    setSessionLoading(true);
    try {
      const res = await fetch("/api/counter-session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession._id,
          actualCountedCash: actualCashInput,
          notes: shiftNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to close shift");

      setEodSummaryReport(data.summary);
      setIsCloseShiftModalOpen(false);
      setActiveSession(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSessionLoading(false);
    }
  };

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
    // Only cashiers need a manager override; the server enforces the same rule
    if (val > 10 && !isManagerAuthorized && userRole === "cashier") {
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
      // Verifies the PIN inside this store only — does NOT change who is logged in
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: managerPin }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid Manager PIN");
      }

      setOverrideToken(data.overrideToken);
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

  const handleOpenSplitModal = () => {
    setSplitCash(grandTotal);
    setSplitCard(0);
    setSplitWallet(0);
    setSplitError("");
    setIsSplitModalOpen(true);
  };

  async function handleCompleteCheckout(paymentsBreakdown?: { method: "cash" | "card" | "wallet" | "store_credit"; amount: number }[]) {
    if (cart.length === 0) return;

    setCheckoutLoading(true);
    // Prices, tax and totals are computed by the server; the client only sends what was picked
    const clientRef = newClientRef();
    const checkoutPayload = {
      items: cart.map((c) => ({
        id: c.id,
        name: c.name,
        quantity: c.quantity,
        discount: c.discount,
      })),
      orderType,
      tableNumber: orderType === "dine_in" ? selectedTable : undefined,
      customerName: customerName || "Walk-in Customer",
      paymentMethod: selectedPayment,
      payments: selectedPayment === "split" ? paymentsBreakdown : undefined,
      discountGlobalPercent,
      overrideToken: overrideToken || undefined,
      clientRef,
    };

    try {
      let res: Response;
      try {
        res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(checkoutPayload),
        });
      } catch (networkErr) {
        if (!isNetworkError(networkErr)) throw networkErr;
        // Offline — queue the sale; it is replayed (idempotently) when the connection returns
        await saveOfflineOrder({
          id: clientRef,
          payload: checkoutPayload,
          grandTotal,
          createdAt: new Date().toISOString(),
        });
        setOfflineQueueCount((n) => n + 1);
        setOfflineNotice("Offline: sale saved on this terminal and will sync automatically when back online.");
        clearCart();
        setIsSplitModalOpen(false);
        setIsManagerAuthorized(false);
        setOverrideToken("");
        setDiscount(0);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process order");
      }

      // Deduct stock locally
      cart.forEach((cartItem) => {
        adjustStock(cartItem.id, -cartItem.quantity);
      });

      // Auto-dispatch KOT ticket for kitchen display screen
      if (orderType === "dine_in" || currentVertical === "restaurant" || currentVertical === "cafe" || currentVertical === "bakery") {
        try {
          await fetch("/api/kot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // The server builds the ticket from the saved order
            body: JSON.stringify({
              orderId: data.order?._id,
              tableNumber: orderType === "dine_in" ? selectedTable : undefined,
              orderType,
            }),
          });
        } catch (kotErr) {
          console.error("Failed to post KOT ticket", kotErr);
        }
      }

      setLastOrderNumber(data.order?.orderNumber || "");
      setLastOrder(data.order || null);
      setShowReceipt(true);
      clearCart();
      setIsManagerAuthorized(false);
      setOverrideToken("");
      setDiscount(0);
      setCustomerName("Walk-in Customer");
      setIsSplitModalOpen(false);
      fetchActiveCounterSession();
    } catch (err: any) {
      alert(`Checkout Error: ${err.message}`);
    } finally {
      setCheckoutLoading(false);
    }
  }

  const handleConfirmSplitPayment = () => {
    const totalPaid = Number(splitCash) + Number(splitCard) + Number(splitWallet);
    if (Math.abs(totalPaid - grandTotal) > 0.01) {
      setSplitError(`Total split payment (PKR ${totalPaid.toLocaleString()}) must equal order total (PKR ${grandTotal.toLocaleString()}).`);
      return;
    }

    const paymentsList: { method: "cash" | "card" | "wallet"; amount: number }[] = [];
    if (splitCash > 0) paymentsList.push({ method: "cash", amount: Number(splitCash) });
    if (splitCard > 0) paymentsList.push({ method: "card", amount: Number(splitCard) });
    if (splitWallet > 0) paymentsList.push({ method: "wallet", amount: Number(splitWallet) });

    handleCompleteCheckout(paymentsList);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Top Shift Counter Bar */}
        <div className="bg-[#0b0b0d] border border-stroke-muted p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 uppercase tracking-wider">Branch: <b className="text-white">{branchLabel || "—"}</b></span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400 uppercase tracking-wider">Cashier: <b className="text-white">{userName || "—"}</b></span>
            {offlineQueueCount > 0 && (
              <>
                <span className="text-gray-600">|</span>
                <span className="text-amber-400 uppercase tracking-wider font-bold">Offline queue: {offlineQueueCount}</span>
              </>
            )}
            <span className="text-gray-600">|</span>
            {activeSession ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Unlock className="w-3.5 h-3.5" /> SHIFT OPEN (Float: PKR {activeSession.openingFloat.toLocaleString()})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <Lock className="w-3.5 h-3.5" /> SHIFT CLOSED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!activeSession ? (
              <button
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 uppercase tracking-wider transition flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" /> Open Counter Shift
              </button>
            ) : (
              <button
                onClick={() => {
                  setActualCashInput(activeSession.expectedCashInDrawer || activeSession.openingFloat);
                  setIsCloseShiftModalOpen(true);
                }}
                className="bg-rose-700 hover:bg-rose-600 text-white font-bold px-3 py-1.5 uppercase tracking-wider transition flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> Close Shift (EOD)
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ height: "calc(100vh - 16rem)" }}>
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
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="btn btn-secondary py-2 px-3 flex items-center gap-1 bg-[#002bba] text-white hover:bg-blue-700"
              >
                <Camera className="w-4 h-4 text-white" />
                <span className="font-accent text-[1.2rem] hidden sm:inline font-bold">Camera Scan</span>
              </button>
            </div>

            {offlineNotice && (
              <div className="flex items-center justify-between gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-4 py-2.5 font-accent text-[1.2rem]">
                <span>{offlineNotice}</span>
                <button type="button" onClick={() => setOfflineNotice("")} aria-label="Dismiss">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

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
                    {tableOptions.length === 0 && <option value="">No tables configured</option>}
                    {tableOptions.map((t) => (
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
              {/* Discount slider */}
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
                  <span>Sales Tax ({taxRate}%):</span>
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

              {/* Payment Method selector */}
              <div className="grid grid-cols-4 gap-1.5">
                {(["cash","card","wallet","split"] as const).map((method) => {
                  const icons = {
                    cash: <Banknote className="w-3.5 h-3.5" />,
                    card: <CreditCard className="w-3.5 h-3.5" />,
                    wallet: <QrCode className="w-3.5 h-3.5" />,
                    split: <Split className="w-3.5 h-3.5" />,
                  };
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setSelectedPayment(method);
                        if (method === "split" && cart.length > 0) {
                          handleOpenSplitModal();
                        }
                      }}
                      className={`btn py-2 text-[1rem] flex items-center justify-center gap-1 transition-colors ${
                        selectedPayment === method ? "btn-primary" : "btn-secondary"
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
                  onClick={() => {
                    if (selectedPayment === "split") {
                      handleOpenSplitModal();
                    } else {
                      handleCompleteCheckout();
                    }
                  }}
                  disabled={cart.length === 0 || checkoutLoading}
                  className="btn btn-primary py-3 text-[1.3rem] disabled:opacity-40"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{checkoutLoading ? "Processing..." : `Pay PKR ${grandTotal.toLocaleString()}`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SPLIT PAYMENT MODAL */}
      {isSplitModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[130] flex items-center justify-center p-4">
          <div className="bg-[#0b0b0d] border border-blue-500/50 w-full max-w-lg p-6 text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2 font-mono font-bold text-[#002bba] text-base uppercase tracking-wider">
                <Split className="w-5 h-5 text-blue-400" />
                <span>Split Payment Checkout</span>
              </div>
              <button onClick={() => setIsSplitModalOpen(false)} className="text-gray-400 hover:text-white font-mono text-xs">
                [Close]
              </button>
            </div>

            <div className="bg-blue-950/40 border border-blue-500/30 p-4 font-mono text-xs space-y-1">
              <div className="flex justify-between text-gray-300">
                <span>Grand Order Total:</span>
                <span className="font-bold text-white text-sm">PKR {grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Entered Payment Total:</span>
                <span className="font-bold text-amber-400 text-sm">
                  PKR {(Number(splitCash) + Number(splitCard) + Number(splitWallet)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-gray-300 pt-1 border-t border-blue-500/20">
                <span>Remaining Balance:</span>
                <span className={`font-bold text-sm ${grandTotal - (Number(splitCash) + Number(splitCard) + Number(splitWallet)) === 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  PKR {(grandTotal - (Number(splitCash) + Number(splitCard) + Number(splitWallet))).toLocaleString()}
                </span>
              </div>
            </div>

            {splitError && (
              <div className="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-3 text-xs font-mono">
                {splitError}
              </div>
            )}

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-gray-300 uppercase tracking-wider mb-1">Cash Payment Amount (PKR)</label>
                <input
                  type="number"
                  value={splitCash}
                  onChange={(e) => setSplitCash(Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 text-white font-bold p-2.5 outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-300 uppercase tracking-wider mb-1">Card Payment Amount (PKR)</label>
                <input
                  type="number"
                  value={splitCard}
                  onChange={(e) => setSplitCard(Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 text-white font-bold p-2.5 outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-300 uppercase tracking-wider mb-1">Wallet / Digital Payment Amount (PKR)</label>
                <input
                  type="number"
                  value={splitWallet}
                  onChange={(e) => setSplitWallet(Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 text-white font-bold p-2.5 outline-none focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setIsSplitModalOpen(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 font-mono text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSplitPayment}
                disabled={checkoutLoading}
                className="flex-1 bg-[#002bba] hover:bg-blue-700 text-white py-2.5 font-mono text-xs uppercase tracking-wider font-bold"
              >
                {checkoutLoading ? "Processing..." : "Confirm & Complete Split Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPEN SHIFT MODAL */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[130] flex items-center justify-center p-4">
          <div className="bg-[#0b0b0d] border border-emerald-500/50 w-full max-w-md p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-mono font-bold text-emerald-400 text-sm uppercase tracking-wider flex items-center gap-2">
                <Unlock className="w-4 h-4" /> Open Counter Shift Float
              </h3>
              <button onClick={() => setIsOpenShiftModalOpen(false)} className="text-gray-400 hover:text-white font-mono text-xs">
                [Close]
              </button>
            </div>

            <form onSubmit={handleOpenShiftSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-gray-300 uppercase tracking-wider mb-1">Opening Cash Float in Drawer (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={openingFloatInput}
                  onChange={(e) => setOpeningFloatInput(Number(e.target.value))}
                  className="w-full bg-gray-900 border border-emerald-500/50 text-emerald-300 font-bold text-lg p-2.5 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 uppercase tracking-wider mb-1">Shift Opening Notes</label>
                <textarea
                  rows={2}
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="e.g. Morning shift start with PKR 5,000 float notes"
                  className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenShiftModalOpen(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sessionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 uppercase font-bold"
                >
                  {sessionLoading ? "Opening..." : "Confirm & Start Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT (EOD) MODAL */}
      {isCloseShiftModalOpen && activeSession && (
        <div className="fixed inset-0 bg-black/80 z-[130] flex items-center justify-center p-4">
          <div className="bg-[#0b0b0d] border border-rose-500/50 w-full max-w-lg p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-mono font-bold text-rose-400 text-sm uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4" /> End of Day (EOD) Shift Close
              </h3>
              <button onClick={() => setIsCloseShiftModalOpen(false)} className="text-gray-400 hover:text-white font-mono text-xs">
                [Close]
              </button>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-4 font-mono text-xs space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Opening Cash Float:</span>
                <span className="text-white font-bold">PKR {activeSession.openingFloat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shift Cash Sales:</span>
                <span className="text-emerald-400 font-bold">PKR {activeSession.cashSalesTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300 pt-2 border-t border-gray-800">
                <span>Expected Cash in Drawer:</span>
                <span className="text-blue-400 font-bold text-sm">PKR {activeSession.expectedCashInDrawer.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleCloseShiftSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-gray-300 uppercase tracking-wider mb-1">Actual Physical Counted Cash (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(Number(e.target.value))}
                  className="w-full bg-gray-900 border border-rose-500/50 text-rose-300 font-bold text-lg p-2.5 outline-none"
                  required
                />
              </div>

              <div className="p-3 bg-gray-950 border border-gray-800 flex justify-between items-center">
                <span className="text-gray-400 uppercase">Calculated Shift Variance:</span>
                <span className={`font-bold text-sm ${actualCashInput - activeSession.expectedCashInDrawer === 0 ? "text-emerald-400" : actualCashInput - activeSession.expectedCashInDrawer < 0 ? "text-rose-400" : "text-amber-400"}`}>
                  PKR {(actualCashInput - activeSession.expectedCashInDrawer).toLocaleString()}
                  {actualCashInput - activeSession.expectedCashInDrawer < 0 ? " (SHORTAGE)" : actualCashInput - activeSession.expectedCashInDrawer > 0 ? " (OVERAGE)" : " (EXACT)"}
                </span>
              </div>

              <div>
                <label className="block text-gray-300 uppercase tracking-wider mb-1">Closing Notes / Discrepancy Reason</label>
                <textarea
                  rows={2}
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="e.g. Cash count verified by shift manager"
                  className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sessionLoading}
                  className="bg-rose-700 hover:bg-rose-600 text-white px-5 py-2 uppercase font-bold"
                >
                  {sessionLoading ? "Closing Shift..." : "Close Shift & Print EOD Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EOD SUMMARY REPORT MODAL */}
      {eodSummaryReport && (
        <div className="fixed inset-0 bg-black/85 z-[140] flex items-center justify-center p-4">
          <div className="bg-[#0b0b0d] border border-blue-500/50 w-full max-w-md p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-mono font-bold text-blue-400 text-sm uppercase tracking-wider flex items-center gap-2">
                <Printer className="w-4 h-4" /> EOD Shift Closing Report
              </h3>
              <button onClick={() => setEodSummaryReport(null)} className="text-gray-400 hover:text-white font-mono text-xs">
                [Close]
              </button>
            </div>

            <div className="bg-gray-900 p-4 border border-gray-800 font-mono text-xs space-y-2">
              <div className="text-center font-bold text-sm text-white uppercase tracking-widest border-b border-gray-800 pb-2">
                RST POS — End of Shift Summary
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Cashier:</span>
                <span className="text-white font-bold">{eodSummaryReport.cashierName}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shift Started:</span>
                <span className="text-white">{new Date(eodSummaryReport.openedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shift Closed:</span>
                <span className="text-white">{new Date(eodSummaryReport.closedAt).toLocaleString()}</span>
              </div>
              <hr className="border-gray-800" />
              <div className="flex justify-between text-gray-300">
                <span>Opening Float:</span>
                <span>PKR {eodSummaryReport.openingFloat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Total Cash Sales:</span>
                <span className="text-emerald-400 font-bold">PKR {eodSummaryReport.cashSalesTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Expected Cash:</span>
                <span className="text-blue-400 font-bold">PKR {eodSummaryReport.expectedCashInDrawer.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Actual Counted:</span>
                <span className="text-white font-bold">PKR {eodSummaryReport.actualCountedCash.toLocaleString()}</span>
              </div>
              <hr className="border-gray-800" />
              <div className="flex justify-between text-sm font-bold">
                <span>Variance:</span>
                <span className={eodSummaryReport.variance === 0 ? "text-emerald-400" : eodSummaryReport.variance < 0 ? "text-rose-400" : "text-amber-400"}>
                  PKR {eodSummaryReport.variance.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-[#002bba] hover:bg-blue-700 text-white py-2 font-mono text-xs uppercase font-bold flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Shift Summary
              </button>
              <button
                onClick={() => setEodSummaryReport(null)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 font-mono text-xs uppercase"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGER PIN OVERRIDE MODAL */}
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

      {/* Thermal Receipt Modal */}
      <ThermalReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        orderNumber={lastOrderNumber}
        dateStr={new Date(lastOrder?.createdAt || Date.now()).toLocaleString("en-PK")}
        cashierName={lastOrder?.cashierName || userName}
        customerName={lastOrder?.customerName || customerName}
        items={(lastOrder?.items || []).map((i: any) => ({
          name: i.productName,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        }))}
        subtotal={lastOrder?.subtotal || 0}
        taxAmount={lastOrder?.taxAmount || 0}
        discountTotal={lastOrder?.discountTotal || 0}
        grandTotal={lastOrder?.grandTotal || 0}
        paymentMethod={lastOrder?.paymentMethod || selectedPayment}
        branchName={branchLabel}
        taxRate={lastOrder?.taxRate}
      />

      {/* Global Hardware Barcode Scanner Listener */}
      <BarcodeScannerListener onScan={handleBarcodeScanned} />

      {/* Mobile Camera Video Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </>
  );
}
