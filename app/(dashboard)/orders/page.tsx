"use client";

import { useCallback, useState, useEffect } from "react";
import { useSessionUser } from "@/components/layout/SessionContext";
import { isStoreManagerRole } from "@/lib/auth/permissions";
import {
  Clock,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  RefreshCw,
} from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  date: string;
  customer: string;
  type: string;
  payment: string;
  itemsCount: number;
  itemsList: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "completed" | "held" | "voided" | "partially_refunded" | "refunded";
  cashier: string;
  fbr?: { status: "pending" | "reported" | "failed"; invoiceNumber?: string; error?: string; environment?: string };
}

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [refundOrder, setRefundOrder] = useState<OrderRecord | null>(null);
  const [refundReason, setRefundReason] = useState("Customer requested refund");
  const [refundMethod, setRefundMethod] = useState<"cash" | "card_reversal" | "store_credit">("cash");
  const [restockFlag, setRestockFlag] = useState(true);
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundSuccessMsg, setRefundSuccessMsg] = useState("");

  const [ordersList, setOrdersList] = useState<OrderRecord[]>([]);

  const sessionUser = useSessionUser();
  const canResendFbr = isStoreManagerRole(sessionUser?.role);
  const [fbrBusy, setFbrBusy] = useState<string | null>(null);
  const [fbrNotice, setFbrNotice] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrdersList(
          data.orders.map((o: any) => ({
            id: o._id,
            orderNumber: o.orderNumber,
            date: new Date(o.createdAt).toLocaleString("en-PK"),
            customer: o.customerName || "Walk-in Guest",
            type: o.orderType ? o.orderType.replace("_", " ").toUpperCase() + (o.tableNumber ? ` (${o.tableNumber})` : "") : "Order",
            payment: o.paymentMethod ? o.paymentMethod.toUpperCase() : "CASH",
            itemsCount: Array.isArray(o.items) ? o.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) : 0,
            itemsList: Array.isArray(o.items)
              ? o.items
                  .map((i: any) => ({
                    id: i.productId || i.sku,
                    name: i.productName || "Product",
                    sku: i.sku || "N/A",
                    price: i.unitPrice || 0,
                    // Only units that have not been refunded yet can be refunded again
                    quantity: (i.quantity || 1) - (i.refundedQuantity || 0),
                  }))
                  .filter((i: OrderItem) => i.quantity > 0)
              : [],
            subtotal: o.subtotal || 0,
            tax: o.taxAmount || 0,
            total: o.grandTotal || 0,
            status: o.status || "completed",
            cashier: o.cashierName || "Cashier",
            fbr: o.fbr?.status ? o.fbr : undefined,
          }))
        );
      } else {
        setOrdersList([]);
      }
    } catch (e) {
      console.error("Failed to fetch orders:", e);
      setOrdersList([]);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Resend sales that FBR has not accepted yet (one order, or all of them)
  async function resendToFbr(orderId?: string) {
    setFbrBusy(orderId || "all");
    setFbrNotice("");
    try {
      const res = await fetch("/api/fbr/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderId ? { orderId } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resend failed");
      setFbrNotice(
        data.reported === data.attempted
          ? `${data.reported} sale(s) accepted by FBR.`
          : `${data.reported} of ${data.attempted} accepted. ${data.errors?.[0]?.error ? `FBR says: ${data.errors[0].error}` : ""}`
      );
      await fetchOrders();
    } catch (err: any) {
      setFbrNotice(err.message || "Resend failed");
    } finally {
      setFbrBusy(null);
    }
  }

  const fbrEnabled = ordersList.some((o) => o.fbr);
  const fbrUnsent = ordersList.filter((o) => o.fbr && o.fbr.status !== "reported").length;

  async function handleConfirmRefund() {
    if (!refundOrder) return;
    setSubmittingRefund(true);
    setRefundSuccessMsg("");

    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalOrderId: refundOrder.id,
          items: refundOrder.itemsList.map((i) => ({
            productId: i.id,
            quantity: i.quantity,
            restockFlag,
            reason: refundReason,
          })),
          refundMethod,
          notes: refundReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process refund");
      }

      if (data.refund?.status === "pending_approval") {
        setRefundSuccessMsg(`Refund request for Order #${refundOrder.orderNumber} sent for Manager approval.`);
      } else {
        setOrdersList((prev) =>
          prev.map((o) => (o.id === refundOrder.id ? { ...o, status: "refunded", itemsList: [] } : o))
        );
        setRefundSuccessMsg(data.message || `Refund for Order #${refundOrder.orderNumber} completed!`);
      }
      setTimeout(() => {
        setRefundSuccessMsg("");
        setRefundOrder(null);
      }, 2500);
    } catch (err: any) {
      alert(err.message || "Failed to process refund");
    } finally {
      setSubmittingRefund(false);
    }
  }

  const filteredOrders = ordersList.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.cashier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-tint border border-stroke-muted p-6">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            <h2 className="font-extrabold text-[2.2rem] text-bright">
              Orders & Receipt Registry
            </h2>
          </div>
          <p className="text-medium text-[1.4rem] mt-1">
            Audit terminal sales, reprint thermal receipts, inspect payment logs, and process manager-approved refunds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-secondary py-3 px-5 text-[1.3rem]">
            <Printer className="w-4 h-4" />
            <span>Export Sales Summary PDF</span>
          </button>
        </div>
      </div>

      {refundSuccessMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-4 text-[1.3rem] font-bold">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{refundSuccessMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-base-tint border border-stroke-muted p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[28rem] flex items-center gap-2 bg-base-bright border border-stroke-muted px-3 py-2">
          <Search className="w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Order ID, Customer Name, Cashier..."
            className="w-full bg-transparent text-[1.4rem] outline-none text-bright font-sans"
          />
        </div>

        <div className="flex items-center gap-3">
          {canResendFbr && fbrUnsent > 0 && (
            <button type="button" onClick={() => resendToFbr()} disabled={!!fbrBusy} className="btn btn-danger py-2 px-3 text-[1.2rem]">
              <RefreshCw className={`w-4 h-4 ${fbrBusy === "all" ? "animate-spin" : ""}`} />
              Resend {fbrUnsent} to FBR
            </button>
          )}
          <span className="font-accent text-[1.2rem] text-muted border border-stroke-muted px-3 py-2 bg-base-bright">
            {filteredOrders.length} orders
          </span>
        </div>
      </div>

      {fbrNotice && (
        <div className="bg-base-tint border border-stroke-muted p-3 text-[1.3rem] text-bright break-all">{fbrNotice}</div>
      )}



      {/* Orders Data Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date & Time</th>
              <th>Order Type</th>
              <th>Customer</th>
              <th>Payment Method</th>
              <th>Items</th>
              <th>Grand Total</th>
              <th>Cashier</th>
              <th>Status</th>
              {fbrEnabled && <th>FBR</th>}
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} className={order.status === "refunded" ? "bg-red-500/5 opacity-70" : ""}>
                <td className="font-accent font-bold text-accent">{order.orderNumber}</td>
                <td className="font-accent text-muted">{order.date}</td>
                <td className="font-medium">{order.type}</td>
                <td>{order.customer}</td>
                <td className="font-accent text-bright">{order.payment}</td>
                <td className="font-accent text-center font-bold">{order.itemsCount}</td>
                <td className="font-accent font-extrabold text-bright">
                  PKR {order.total.toLocaleString()}
                </td>
                <td className="font-accent text-muted">{order.cashier}</td>
                <td>
                  {order.status === "completed" ? (
                    <span className="badge badge-success flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>COMPLETED</span>
                    </span>
                  ) : order.status === "refunded" || order.status === "partially_refunded" ? (
                    <span className="badge badge-error flex items-center gap-1 w-fit">
                      <RotateCcw className="w-3 h-3" />
                      <span>{order.status === "refunded" ? "REFUNDED" : "PARTIAL REFUND"}</span>
                    </span>
                  ) : (
                    <span className="badge badge-warning flex items-center gap-1 w-fit">
                      <AlertTriangle className="w-3 h-3" />
                      <span>HELD</span>
                    </span>
                  )}
                </td>
                {fbrEnabled && (
                  <td>
                    {order.fbr?.status === "reported" ? (
                      <span className="badge badge-success w-fit" title={order.fbr.invoiceNumber}>
                        FBR ✓{order.fbr.environment === "sandbox" ? " (TEST)" : ""}
                      </span>
                    ) : order.fbr ? (
                      <div className="flex items-center gap-2">
                        <span className="badge badge-error w-fit" title={order.fbr.error}>
                          NOT SENT
                        </span>
                        {canResendFbr && (
                          <button
                            type="button"
                            onClick={() => resendToFbr(order.id)}
                            disabled={!!fbrBusy}
                            className="p-1.5 text-accent hover:bg-accent-subtle border border-stroke-muted"
                            title={`Resend to FBR${order.fbr.error ? ` — last error: ${order.fbr.error}` : ""}`}
                          >
                            <RefreshCw className={`w-4 h-4 ${fbrBusy === order.id ? "animate-spin" : ""}`} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted text-[1.2rem]">—</span>
                    )}
                  </td>
                )}
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {(order.status === "completed" || order.status === "partially_refunded") && order.itemsList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRefundOrder(order)}
                        className="p-1.5 text-error hover:bg-red-500/10 border border-red-500/30 transition-colors"
                        title="Refund Order"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* REFUND & RETURNS MODAL */}
      {refundOrder && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4">
          <div className="bg-[#171719] border border-red-500/50 w-full max-w-lg p-6 text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-4">
              <div className="flex items-center gap-2 text-red-400 font-accent font-extrabold text-[1.5rem] uppercase">
                <RotateCcw className="w-5 h-5" />
                <span>Process Order Refund — #{refundOrder.orderNumber}</span>
              </div>
              <button onClick={() => setRefundOrder(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#0b0b0d] border border-[rgba(255,255,255,0.1)] p-4 font-accent text-[1.3rem] space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Original Total:</span>
                <span className="font-bold text-white">PKR {refundOrder.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Customer:</span>
                <span className="font-bold text-accent">{refundOrder.customer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payment Method:</span>
                <span className="font-bold text-emerald-400">{refundOrder.payment}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="form-label text-gray-300">Refund Reason *</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-red-500 appearance-none cursor-pointer"
                >
                  <option value="Customer requested refund">Customer requested refund</option>
                  <option value="Wrong billing / pricing error">Wrong billing / pricing error</option>
                  <option value="Item defective / expired">Item defective / expired</option>
                  <option value="Order cancelled by manager">Order cancelled by manager</option>
                </select>
              </div>

              <div>
                <label className="form-label text-gray-300">Refund Payout Method</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as any)}
                  className="w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.15)] text-white px-3 py-2.5 text-[1.4rem] outline-none focus:border-red-500 appearance-none cursor-pointer"
                >
                  <option value="cash">Cash Outflow from Drawer</option>
                  <option value="card_reversal">Card Reversal</option>
                  <option value="store_credit">Store Credit Voucher</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="restockFlag"
                  checked={restockFlag}
                  onChange={(e) => setRestockFlag(e.target.checked)}
                  className="w-5 h-5 accent-red-600 cursor-pointer"
                />
                <label htmlFor="restockFlag" className="font-accent text-[1.2rem] text-gray-300 cursor-pointer">
                  Auto-Restock items back into product inventory count
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-[rgba(255,255,255,0.1)]">
              <button
                type="button"
                onClick={() => setRefundOrder(null)}
                className="flex-1 btn btn-secondary py-3 bg-[#0b0b0d] text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={submittingRefund}
                className="flex-1 btn btn-primary py-3 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {submittingRefund ? "Processing Refund..." : `Confirm Refund (${refundOrder.itemsList.reduce((sum, i) => sum + i.quantity, 0)} item(s))`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
