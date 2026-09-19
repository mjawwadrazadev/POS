"use client";

import { Printer, X, CheckCircle2, Share2 } from "lucide-react";

interface ReceiptItem {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  dateStr: string;
  cashierName: string;
  customerName: string;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: string;
  branchName: string;
}

export function ThermalReceiptModal({
  isOpen,
  onClose,
  orderNumber,
  dateStr,
  cashierName,
  customerName,
  items,
  subtotal,
  taxAmount,
  discountTotal,
  grandTotal,
  paymentMethod,
  branchName,
}: ThermalReceiptModalProps) {
  if (!isOpen) return null;

  function handlePrintWindow() {
    window.print();
  }

  const whatsappMessage = encodeURIComponent(
    `*RST POS RECEIPT*\nOrder #: ${orderNumber}\nTotal: PKR ${grandTotal}\nThank you for visiting ${branchName}!`
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#171719] border border-[rgba(255,255,255,0.15)] w-full max-w-md p-6 space-y-6 text-white shadow-2xl">
        {/* Modal Controls */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#819ffe]" />
            <h3 className="font-accent font-extrabold text-[1.4rem] uppercase">
              ESC/POS Thermal Receipt (80mm)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 80mm Receipt Formatting Box (Monospace Styled) */}
        <div
          id="receipt-print-area"
          className="bg-white text-black p-6 font-mono text-[1.2rem] leading-tight border border-gray-300 shadow-inner space-y-3"
        >
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="font-bold text-[1.6rem] uppercase tracking-wider">
              RST BAKERS & POS
            </h2>
            <p className="text-[1.1rem]">{branchName}</p>
            <p className="text-[1rem] text-gray-700">TEL: +92 42 111 778 778</p>
            <p className="text-[1rem] text-gray-700">FBR NTN: 8847291-0</p>
            <div className="border-b border-dashed border-black my-2" />
          </div>

          {/* Meta Details */}
          <div className="text-[1.1rem] space-y-1">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span className="font-bold">{orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{dateStr || new Date().toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{customerName}</span>
            </div>
            <div className="border-b border-dashed border-black my-2" />
          </div>

          {/* Items Header */}
          <div className="grid grid-cols-12 font-bold text-[1.1rem] uppercase border-b border-black pb-1">
            <span className="col-span-6">ITEM</span>
            <span className="col-span-2 text-center">QTY</span>
            <span className="col-span-4 text-right">TOTAL</span>
          </div>

          {/* Items List */}
          <div className="space-y-1 text-[1.1rem]">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12">
                <span className="col-span-6 truncate font-medium">{item.name}</span>
                <span className="col-span-2 text-center font-bold">{item.quantity}</span>
                <span className="col-span-4 text-right font-bold">
                  {item.total}
                </span>
              </div>
            ))}
          </div>

          <div className="border-b border-dashed border-black my-2" />

          {/* Totals */}
          <div className="space-y-1 text-[1.1rem]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>PKR {subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Sales Tax (16%):</span>
              <span>PKR {taxAmount}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-red-700 font-bold">
                <span>Discount:</span>
                <span>- PKR {discountTotal}</span>
              </div>
            )}
            <div className="border-t border-black pt-1 flex justify-between text-[1.4rem] font-extrabold">
              <span>NET TOTAL:</span>
              <span>PKR {grandTotal}</span>
            </div>
            <div className="flex justify-between text-[1.1rem] pt-1">
              <span>Payment Mode:</span>
              <span className="font-bold uppercase">{paymentMethod}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-black my-2" />

          {/* Barcode & Footer */}
          <div className="text-center space-y-2 pt-1">
            <div className="font-bold text-[1.4rem] tracking-widest font-mono">
              ||||| | |||||| || |||||||
            </div>
            <p className="text-[1rem] uppercase font-bold">
              Software Powered by NIB IT Solutions
            </p>
            <p className="text-[0.9rem] italic">Thank you for shopping with us!</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`https://wa.me/?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary py-3 text-[1.2rem] flex items-center justify-center gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp Share</span>
          </a>

          <button
            type="button"
            onClick={handlePrintWindow}
            className="btn btn-primary py-3 text-[1.2rem] flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print ESC/POS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
