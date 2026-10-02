"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowRightLeft,
  Plus,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Truck,
  X,
  Trash2,
  Building2,
  Boxes,
} from "lucide-react";
import { PageActions } from "@/components/layout/PageActions";

interface BranchOption {
  id: string;
  name: string;
  code: string;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
}

interface TransferRecord {
  _id: string;
  transferNumber: string;
  fromBranchId: { _id: string; name: string; code: string } | string;
  toBranchId: { _id: string; name: string; code: string } | string;
  items: { productId: string; productName: string; sku: string; quantity: number }[];
  status: "pending" | "in_transit" | "received" | "cancelled";
  requestedBy: string;
  approvedBy?: string;
  createdAt: string;
  notes?: string;
}

type StatusFilter = "all" | "in_transit" | "received" | "cancelled";

interface TransferLine {
  key: number;
  productId: string;
  quantity: number;
}

const STATUS_META: Record<TransferRecord["status"], { label: string; icon: React.ReactNode; className: string }> = {
  pending: { label: "Pending", icon: <Clock className="w-3.5 h-3.5" />, className: "bg-slate-500/10 text-slate-600 border-slate-500/30" },
  in_transit: { label: "In transit", icon: <Truck className="w-3.5 h-3.5" />, className: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  received: { label: "Received", icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  cancelled: { label: "Cancelled", icon: <XCircle className="w-3.5 h-3.5" />, className: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
};

const inputClass =
  "w-full bg-base-bright border border-stroke-muted text-bright px-3 py-2.5 text-[1.4rem] outline-none focus:border-accent";

let lineKey = 0;
const newLine = (productId = ""): TransferLine => ({ key: ++lineKey, productId, quantity: 1 });

export default function StockTransferPage() {
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // New transfer form state
  const [fromBranch, setFromBranch] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([newLine()]);
  const [transferNotes, setTransferNotes] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Independent calls, so they load together
      const [trData, brData, prodData] = await Promise.all(
        ["/api/inventory/transfers", "/api/branches", "/api/products"].map((url) =>
          fetch(url)
            .then((r) => r.json())
            .catch(() => ({}))
        )
      );
      if (trData.success && trData.transfers) {
        setTransfers(trData.transfers);
      }

      // This organization's real branches
      if (brData.success && Array.isArray(brData.branches)) {
        const list: BranchOption[] = brData.branches.map((b: any) => ({ id: b._id, name: b.name, code: b.code }));
        setBranches(list);
        setFromBranch((prev) => prev || list[0]?.id || "");
        setToBranch((prev) => prev || list[1]?.id || "");
      }

      if (prodData.success && prodData.products) {
        setProducts(
          prodData.products.map((p: any) => ({
            id: p._id,
            name: p.name,
            sku: p.sku,
            stock: p.stock,
          }))
        );
      }
    } catch (err: any) {
      console.error("Failed to load transfer data", err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setFormError("");
    setTransferNotes("");
    setLines([newLine(products.find((p) => p.stock > 0)?.id || products[0]?.id || "")]);
    setIsModalOpen(true);
  };

  const updateLine = (key: number, patch: Partial<TransferLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    if (!fromBranch || !toBranch || fromBranch === toBranch) {
      setFormError("Pick two different branches.");
      return;
    }

    const chosen = lines.filter((l) => l.productId);
    if (chosen.length === 0) {
      setFormError("Add at least one product to transfer.");
      return;
    }
    const ids = chosen.map((l) => l.productId);
    if (new Set(ids).size !== ids.length) {
      setFormError("Each product can only appear once — combine the quantities into one line.");
      return;
    }
    for (const line of chosen) {
      const product = products.find((p) => p.id === line.productId);
      if (!product) continue;
      if (line.quantity < 1) {
        setFormError(`Enter a quantity for ${product.name}.`);
        return;
      }
      if (line.quantity > product.stock) {
        setFormError(`Only ${product.stock} unit(s) of ${product.name} are in stock.`);
        return;
      }
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromBranchId: fromBranch,
          toBranchId: toBranch,
          items: chosen.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
          notes: transferNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch transfer");

      setSuccessMsg(`Transfer ${data.transfer.transferNumber} is on its way.`);
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (transferId: string, action: "receive" | "cancel") => {
    const question =
      action === "receive"
        ? "Confirm that this stock has arrived at the destination branch?"
        : "Cancel this transfer and return the stock to the source branch?";
    if (!confirm(question)) return;

    setActionLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/inventory/transfers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      setSuccessMsg(data.message);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getBranchName = (b: any) => {
    if (!b) return "N/A";
    if (typeof b === "object") return b.name || b.code || "Branch";
    const found = branches.find((item) => item.id === b);
    return found ? found.name : b;
  };

  const counts = {
    all: transfers.length,
    in_transit: transfers.filter((t) => t.status === "in_transit").length,
    received: transfers.filter((t) => t.status === "received").length,
    cancelled: transfers.filter((t) => t.status === "cancelled").length,
  };
  const unitsInTransit = transfers
    .filter((t) => t.status === "in_transit")
    .reduce((sum, t) => sum + t.items.reduce((n, i) => n + i.quantity, 0), 0);
  const visibleTransfers = statusFilter === "all" ? transfers : transfers.filter((t) => t.status === statusFilter);
  const needsBranches = !loading && branches.length < 2;

  const stats = [
    { label: "In transit", value: counts.in_transit, sub: `${unitsInTransit} unit(s) on the road`, icon: <Truck className="w-5 h-5" />, tone: "text-amber-600 bg-amber-500/10" },
    { label: "Received", value: counts.received, sub: "Stock added at destination", icon: <CheckCircle2 className="w-5 h-5" />, tone: "text-emerald-600 bg-emerald-500/10" },
    { label: "Cancelled", value: counts.cancelled, sub: "Returned to source", icon: <XCircle className="w-5 h-5" />, tone: "text-rose-600 bg-rose-500/10" },
    { label: "Branches", value: branches.length, sub: "Locations you can move stock between", icon: <Building2 className="w-5 h-5" />, tone: "text-accent bg-accent-subtle" },
  ];

  return (
    <div className="space-y-5">
      <PageActions>
        <button onClick={fetchData} className="btn btn-secondary py-2.5 px-3.5 text-[1.2rem]" title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={openModal} disabled={needsBranches} className="btn btn-primary py-2.5 text-[1.25rem] disabled:opacity-40 disabled:cursor-not-allowed">
          <Plus className="w-4 h-4" /> New Transfer
        </button>
      </PageActions>

      {needsBranches && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-accent-subtle border border-[rgba(0,43,186,0.3)] px-4 py-3.5">
          <div className="flex items-center gap-3 text-[1.4rem] text-bright">
            <Building2 className="w-5 h-5 text-accent flex-shrink-0" />
            <span>
              Transfers need at least <b>two branches</b>. You have {branches.length}. Add another branch to start moving stock.
            </span>
          </div>
          <Link href="/settings/team" className="btn btn-primary py-2 text-[1.2rem]">
            Add a branch
          </Link>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 px-4 py-3 text-[1.35rem]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {successMsg}
          </span>
          <button onClick={() => setSuccessMsg("")} aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center justify-between gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 px-4 py-3 text-[1.35rem]">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {errorMsg}
          </span>
          <button onClick={() => setErrorMsg("")} aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-base-bright border border-stroke-muted p-4 flex items-start gap-3">
            <div className={`w-[4rem] h-[4rem] flex items-center justify-center flex-shrink-0 ${s.tone}`}>{s.icon}</div>
            <div className="min-w-0">
              <div className="text-[1.3rem] text-muted">{s.label}</div>
              <div className="text-[2.6rem] font-extrabold text-bright leading-tight">{s.value}</div>
              <div className="text-[1.2rem] text-muted truncate">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Transfer list */}
      <div className="bg-base-bright border border-stroke-muted">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-stroke-muted">
          <div className="inline-flex bg-base-tint border border-stroke-muted p-1">
            {(
              [
                ["all", "All"],
                ["in_transit", "In transit"],
                ["received", "Received"],
                ["cancelled", "Cancelled"],
              ] as [StatusFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3.5 py-1.5 text-[1.3rem] font-semibold transition-colors ${
                  statusFilter === key ? "bg-accent text-white" : "text-medium hover:text-bright"
                }`}
              >
                {label}
                <span className={`ml-1.5 text-[1.15rem] ${statusFilter === key ? "opacity-75" : "text-muted"}`}>{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>

        {visibleTransfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-16 px-6">
            <div className="w-[6.4rem] h-[6.4rem] flex items-center justify-center bg-base-tint border border-stroke-muted">
              <ArrowRightLeft className="w-8 h-8 text-stroke-medium" />
            </div>
            <p className="text-[1.6rem] font-semibold text-bright">
              {transfers.length === 0 ? "No transfers yet" : "No transfers with this status"}
            </p>
            <p className="text-[1.35rem] text-muted max-w-[44rem]">
              {transfers.length === 0
                ? "When one branch runs low, send stock from another. Every transfer is tracked here until it is received."
                : "Pick another filter above to see the rest."}
            </p>
            {transfers.length === 0 && !needsBranches && (
              <button onClick={openModal} className="btn btn-primary py-2.5 text-[1.25rem] mt-1">
                <Plus className="w-4 h-4" /> Create first transfer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full text-left border-collapse min-w-[80rem]">
              <thead>
                <tr className="text-[1.2rem] text-muted border-b border-stroke-muted bg-base-tint">
                  <th className="px-4 py-3 font-semibold">Transfer</th>
                  <th className="px-4 py-3 font-semibold">Route</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--st-muted)] text-[1.35rem]">
                {visibleTransfers.map((tr) => {
                  const meta = STATUS_META[tr.status];
                  const units = tr.items.reduce((n, i) => n + i.quantity, 0);
                  return (
                    <tr key={tr._id} className="hover:bg-accent-subtle align-top">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-bright">{tr.transferNumber}</div>
                        <div className="text-[1.2rem] text-muted">
                          {new Date(tr.createdAt).toLocaleDateString()} ·{" "}
                          {new Date(tr.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 font-semibold text-bright">
                          <span className="truncate max-w-[16rem]">{getBranchName(tr.fromBranchId)}</span>
                          <ArrowRight className="w-4 h-4 text-accent flex-shrink-0" />
                          <span className="truncate max-w-[16rem]">{getBranchName(tr.toBranchId)}</span>
                        </div>
                        {tr.notes && <div className="text-[1.2rem] text-muted mt-0.5 line-clamp-1">{tr.notes}</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5 max-w-[34rem]">
                          {tr.items.map((i, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-1 bg-base-tint border border-stroke-muted text-[1.25rem]">
                              <Package className="w-3.5 h-3.5 text-accent" />
                              <span className="text-bright">{i.productName}</span>
                              <b className="text-medium">×{i.quantity}</b>
                            </span>
                          ))}
                        </div>
                        <div className="text-[1.15rem] text-muted mt-1">{units} unit(s) total</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[1.2rem] font-semibold border ${meta.className}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {tr.status === "in_transit" ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateStatus(tr._id, "receive")}
                              className="btn py-2 px-3 text-[1.15rem] bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Receive
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateStatus(tr._id, "cancel")}
                              className="btn btn-secondary py-2 px-3 text-[1.15rem] text-rose-600"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-[1.25rem] text-muted">
                            {tr.status === "received" ? "Stock added" : tr.status === "cancelled" ? "Stock returned" : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New transfer modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-base-bright border border-stroke-muted w-full max-w-[68rem] shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-5 py-4 border-b border-stroke-muted">
              <h3 className="text-[1.8rem] font-bold text-bright flex items-center gap-2">
                <Truck className="w-5 h-5 text-accent" /> New Stock Transfer
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-bright p-1" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="flex flex-col min-h-0">
              <div className="p-5 space-y-5 overflow-y-auto thin-scrollbar">
                {/* Route */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                  <label className="block">
                    <span className="block text-[1.3rem] font-semibold text-medium mb-1.5">From branch</span>
                    <select value={fromBranch} onChange={(e) => setFromBranch(e.target.value)} className={inputClass}>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="w-[4rem] h-[4.4rem] flex items-center justify-center text-accent">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                  <label className="block">
                    <span className="block text-[1.3rem] font-semibold text-medium mb-1.5">To branch</span>
                    <select value={toBranch} onChange={(e) => setToBranch(e.target.value)} className={inputClass}>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id} disabled={b.id === fromBranch}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Product lines */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[1.3rem] font-semibold text-medium flex items-center gap-1.5">
                      <Boxes className="w-4 h-4" /> Products
                    </span>
                    <button
                      type="button"
                      onClick={() => setLines((prev) => [...prev, newLine()])}
                      className="text-[1.3rem] font-semibold text-accent hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add product
                    </button>
                  </div>
                  <div className="space-y-2">
                    {lines.map((line) => {
                      const product = products.find((p) => p.id === line.productId);
                      const over = product ? line.quantity > product.stock : false;
                      return (
                        <div key={line.key} className="grid grid-cols-[1fr_9rem_auto] gap-2 items-start">
                          <div>
                            <select
                              value={line.productId}
                              onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                              className={inputClass}
                            >
                              <option value="">Select a product…</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                                  {p.name} ({p.sku}) — {p.stock} in stock
                                </option>
                              ))}
                            </select>
                            {product && (
                              <span className={`block text-[1.2rem] mt-1 ${over ? "text-rose-600 font-semibold" : "text-muted"}`}>
                                {over ? `Only ${product.stock} available` : `${product.stock} available`}
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => updateLine(line.key, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                            className={`${inputClass} font-bold text-center ${over ? "border-rose-500" : ""}`}
                            aria-label="Quantity"
                          />
                          <button
                            type="button"
                            onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== line.key) : prev))}
                            disabled={lines.length === 1}
                            className="w-[4.4rem] h-[4.4rem] flex items-center justify-center border border-stroke-muted text-muted hover:text-rose-600 disabled:opacity-30"
                            aria-label="Remove product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {products.length === 0 && (
                    <p className="text-[1.3rem] text-muted mt-2">No products found. Add products in Inventory → Products & SKUs first.</p>
                  )}
                </div>

                <label className="block">
                  <span className="block text-[1.3rem] font-semibold text-medium mb-1.5">Note (optional)</span>
                  <textarea
                    rows={2}
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="e.g. Weekend restock for the DHA branch"
                    className={inputClass}
                  />
                </label>

                {formError && (
                  <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 px-3 py-2.5 text-[1.3rem]">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 px-5 py-4 border-t border-stroke-muted bg-base-tint">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary py-2.5 text-[1.25rem]">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary py-2.5 text-[1.25rem] disabled:opacity-50">
                  <Truck className="w-4 h-4" />
                  {actionLoading ? "Sending…" : "Send Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
