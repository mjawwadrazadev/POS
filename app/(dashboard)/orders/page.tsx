"use client";

import { useState } from "react";
import {
  Clock,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
} from "lucide-react";

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const ordersList = [
    {
      id: "ORD-99812",
      date: "2026-09-19 10:42 AM",
      customer: "Tariq Mahmood",
      type: "Prescription Sale",
      payment: "Cash",
      items: 4,
      subtotal: "PKR 2,974",
      tax: "PKR 476",
      total: "PKR 3,450",
      status: "completed",
      cashier: "Ahmed Ali",
    },
    {
      id: "ORD-99811",
      date: "2026-09-19 10:28 AM",
      customer: "Walk-in Guest",
      type: "Table 04 (Dine-in)",
      payment: "Card (Stripe)",
      items: 6,
      subtotal: "PKR 7,690",
      tax: "PKR 1,230",
      total: "PKR 8,920",
      status: "completed",
      cashier: "Ahmed Ali",
    },
    {
      id: "ORD-99810",
      date: "2026-09-19 09:55 AM",
      customer: "Usman Raza",
      type: "Retail Sale",
      payment: "Pending",
      items: 2,
      subtotal: "PKR 1,034",
      tax: "PKR 166",
      total: "PKR 1,200",
      status: "held",
      cashier: "Ahmed Ali",
    },
    {
      id: "ORD-99809",
      date: "2026-09-19 09:14 AM",
      customer: "Bilal Hassan",
      type: "Device Sale (IMEI)",
      payment: "JazzCash Wallet",
      items: 1,
      subtotal: "PKR 38,793",
      tax: "PKR 6,207",
      total: "PKR 45,000",
      status: "completed",
      cashier: "Zeeshan Khan",
    },
  ];

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
            Audit terminal sales, reprint thermal receipts, inspect payment logs & handle refunds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-secondary py-3 px-5 text-[1.3rem]">
            <Printer className="w-4 h-4" />
            <span>Export EOD Summary PDF</span>
          </button>
        </div>
      </div>

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
          <button type="button" className="btn btn-secondary py-2 px-4 text-[1.2rem]">
            <Filter className="w-4 h-4" />
            <span>Filter Status</span>
          </button>
        </div>
      </div>

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
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ordersList.map((order) => (
              <tr key={order.id}>
                <td className="font-accent font-bold text-accent">{order.id}</td>
                <td className="font-accent text-muted">{order.date}</td>
                <td className="font-medium">{order.type}</td>
                <td>{order.customer}</td>
                <td className="font-accent text-bright">{order.payment}</td>
                <td className="font-accent text-center">{order.items}</td>
                <td className="font-accent font-extrabold text-bright">
                  {order.total}
                </td>
                <td className="font-accent text-muted">{order.cashier}</td>
                <td>
                  {order.status === "completed" ? (
                    <span className="badge badge-success flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>COMPLETED</span>
                    </span>
                  ) : (
                    <span className="badge badge-warning flex items-center gap-1 w-fit">
                      <AlertTriangle className="w-3 h-3" />
                      <span>HELD</span>
                    </span>
                  )}
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="p-1.5 text-medium hover:text-accent hover:bg-accent-subtle transition-colors"
                      title="Inspect Order Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-medium hover:text-accent hover:bg-accent-subtle transition-colors"
                      title="Print Thermal Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-medium hover:text-error hover:bg-red-500/10 transition-colors"
                      title="Refund / Void Order"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
