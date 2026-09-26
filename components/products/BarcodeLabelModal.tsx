"use client";

import { Printer, X, Tag } from "lucide-react";

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  sku: string;
  barcode: string;
  price: number;
  weightGrams?: number;
  expiryTime?: string;
}

export function BarcodeLabelModal({
  isOpen,
  onClose,
  productName,
  sku,
  barcode,
  price,
  weightGrams,
  expiryTime,
}: BarcodeLabelModalProps) {
  if (!isOpen) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#171719] border border-[rgba(255,255,255,0.15)] w-full max-w-sm p-6 space-y-6 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#819ffe]" />
            <h3 className="font-accent font-extrabold text-[1.4rem] uppercase">
              Barcode Label Sticker
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

        {/* Sticker Preview Box */}
        <div className="bg-white text-black p-4 font-mono text-center border-2 border-dashed border-gray-400 space-y-2 shadow-inner">
          <div className="font-bold text-[1.3rem] uppercase tracking-wider">
            RST BAKERS & POS
          </div>
          <div className="font-extrabold text-[1.4rem] line-clamp-1">
            {productName}
          </div>
          <div className="flex justify-between text-[1.1rem] px-2 font-bold">
            <span>SKU: {sku}</span>
            {weightGrams && <span>Wt: {weightGrams}g</span>}
          </div>
          {expiryTime && (
            <div className="text-[1rem] text-red-600 font-bold">
              Best Before: {expiryTime}
            </div>
          )}

          {/* Barcode Lines */}
          <div className="py-2">
            <div className="font-extrabold text-[1.8rem] tracking-widest leading-none font-mono">
              ||| | |||| | ||||| | ||
            </div>
            <div className="text-[1.1rem] font-bold mt-1">
              {barcode || "8901234567001"}
            </div>
          </div>

          <div className="text-[1.6rem] font-black border-t border-black pt-1">
            PKR {price}
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="w-full btn btn-primary py-3 text-[1.3rem] flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>Print Sticker Label</span>
        </button>
      </div>
    </div>
  );
}
