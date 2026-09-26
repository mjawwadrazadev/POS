"use client";

import { useState, useEffect } from "react";
import {
  ArrowRightLeft,
  Plus,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Truck,
} from "lucide-react";

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

export default function StockTransferPage() {
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // New transfer form state
  const [fromBranch, setFromBranch] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [transferQty, setTransferQty] = useState(1);
  const [transferNotes, setTransferNotes] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch transfers
      const trRes = await fetch("/api/inventory/transfers");
      const trData = await trRes.json();
      if (trData.success && trData.transfers) {
        setTransfers(trData.transfers);
      }

      // Fetch this organization's real branches
      const brRes = await fetch("/api/branches");
      const brData = await brRes.json();
      if (brData.success && Array.isArray(brData.branches)) {
        const list: BranchOption[] = brData.branches.map((b: any) => ({ id: b._id, name: b.name, code: b.code }));
        setBranches(list);
        setFromBranch((prev) => prev || list[0]?.id || "");
        setToBranch((prev) => prev || list[1]?.id || "");
      }

      // Fetch products for dropdown
      const prodRes = await fetch("/api/products");
      const prodData = await prodRes.json();
      if (prodData.success && prodData.products) {
        setProducts(
          prodData.products.map((p: any) => ({
            id: p._id,
            name: p.name,
            sku: p.sku,
            stock: p.stock,
          }))
        );
        if (prodData.products.length > 0) {
          setSelectedProductId(prodData.products[0]._id);
        }
      }
    } catch (err: any) {
      console.error("Failed to load transfer data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedProductId) {
      setErrorMsg("Please select a product to transfer.");
      return;
    }

    const targetProd = products.find((p) => p.id === selectedProductId);
    if (!targetProd) return;

    if (!fromBranch || !toBranch || fromBranch === toBranch) {
      setErrorMsg("Select two different branches. Add branches in Settings → Team & Branches.");
      return;
    }

    if (transferQty > targetProd.stock) {
      setErrorMsg(`Cannot transfer ${transferQty} units. Available stock: ${targetProd.stock}`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromBranchId: fromBranch,
          toBranchId: toBranch,
          items: [
            {
              productId: targetProd.id,
              quantity: Number(transferQty),
            },
          ],
          notes: transferNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch transfer");

      setSuccessMsg(`Transfer ${data.transfer.transferNumber} dispatched in-transit successfully!`);
      setIsModalOpen(false);
      setTransferNotes("");
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (transferId: string, action: "receive" | "cancel") => {
    if (!confirm(`Are you sure you want to ${action} this stock transfer?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/inventory/transfers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transferId,
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      setSuccessMsg(data.message);
      fetchData();
    } catch (err: any) {
      alert(err.message);
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0b0b0d] border border-gray-800 p-6 text-white">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 uppercase tracking-widest mb-1">
            <Truck className="w-4 h-4" /> Multi-Branch Logistics
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-white">
            Inter-Branch Stock Transfer Engine
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Dispatch, track in-transit items, and confirm branch inventory receipts with real-time stock sync.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono px-3 py-2 border border-gray-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={() => {
              setErrorMsg("");
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#002bba] hover:bg-blue-700 text-white text-xs font-mono px-4 py-2 uppercase tracking-wider transition font-bold"
          >
            <Plus className="w-4 h-4" /> New Dispatch Transfer
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-4 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-4 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stock Transfer History Table */}
      <div className="bg-[#0b0b0d] border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2 uppercase tracking-wider">
            <ArrowRightLeft className="w-4 h-4 text-blue-400" /> Transfer Records ({transfers.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/80 text-gray-400 text-xs font-mono uppercase tracking-wider border-b border-gray-800">
                <th className="p-4">Transfer Ref</th>
                <th className="p-4">From Branch</th>
                <th className="p-4">To Branch</th>
                <th className="p-4">Items / Qty</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-xs font-mono">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No stock transfer records found. Click &quot;New Dispatch Transfer&quot; to initiate a transfer.
                  </td>
                </tr>
              ) : (
                transfers.map((tr) => (
                  <tr key={tr._id} className="hover:bg-gray-900/40 transition">
                    <td className="p-4 font-bold text-white tracking-wider">{tr.transferNumber}</td>
                    <td className="p-4 text-gray-300">{getBranchName(tr.fromBranchId)}</td>
                    <td className="p-4 text-gray-300">{getBranchName(tr.toBranchId)}</td>
                    <td className="p-4 text-gray-200">
                      {tr.items.map((i, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Package className="w-3 h-3 text-blue-400" />
                          <span className="font-semibold text-white">{i.productName}</span>
                          <span className="text-gray-400">({i.quantity} units)</span>
                        </div>
                      ))}
                    </td>
                    <td className="p-4">
                      {tr.status === "in_transit" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                          <Clock className="w-3 h-3" /> In Transit
                        </span>
                      )}
                      {tr.status === "received" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                          <CheckCircle2 className="w-3 h-3" /> Received
                        </span>
                      )}
                      {tr.status === "cancelled" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase">
                          <XCircle className="w-3 h-3" /> Cancelled
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-400">
                      {new Date(tr.createdAt).toLocaleDateString()} {new Date(tr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 text-right">
                      {tr.status === "in_transit" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={actionLoading}
                            onClick={() => handleUpdateStatus(tr._id, "receive")}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono px-3 py-1 uppercase tracking-wider font-bold transition"
                          >
                            Confirm Receipt
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleUpdateStatus(tr._id, "cancel")}
                            className="bg-gray-800 hover:bg-rose-950 text-rose-300 border border-rose-800 text-[11px] font-mono px-2.5 py-1 uppercase tracking-wider transition"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {tr.status === "received" && (
                        <span className="text-gray-500 italic text-[11px]">Stock Synced</span>
                      )}
                      {tr.status === "cancelled" && (
                        <span className="text-gray-500 italic text-[11px]">Reverted</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Dispatch Transfer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0b0d] border border-blue-600/50 w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" /> Dispatch Stock Transfer
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-mono uppercase"
              >
                [Close]
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 uppercase tracking-wider mb-1">Source Branch</label>
                  <select
                    value={fromBranch}
                    onChange={(e) => setFromBranch(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none focus:border-blue-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-wider mb-1">Target Branch</label>
                  <select
                    value={toBranch}
                    onChange={(e) => setToBranch(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none focus:border-blue-500"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-wider mb-1">Select Inventory Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none focus:border-blue-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.sku}) — Available: {p.stock} units
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-wider mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-wider mb-1">Notes / Inter-Branch Reason</label>
                <textarea
                  rows={2}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Stock replenishment request from DHA manager"
                  className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 uppercase font-mono tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-[#002bba] hover:bg-blue-700 text-white px-5 py-2 uppercase font-mono tracking-wider font-bold"
                >
                  {actionLoading ? "Dispatching..." : "Dispatch Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
