"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer, X, Tag, AlertCircle, CheckCircle2 } from "lucide-react";
import { PrinterService } from "@/lib/printer/PrinterService";
import { barcodeFormatFor, sanitizeBarcodeValue } from "@/lib/printer/barcode";
import { useSessionUser } from "@/components/layout/SessionContext";

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

// Common sticker sizes (width x height in mm)
const LABEL_SIZES = [
  { w: 50, h: 30 },
  { w: 50, h: 25 },
  { w: 40, h: 30 },
  { w: 38, h: 25 },
  { w: 58, h: 40 },
  { w: 100, h: 50 },
];

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, {
        format: barcodeFormatFor(value),
        width: 2,
        height: 50,
        margin: 0,
        fontSize: 14,
        displayValue: true,
      });
      // JsBarcode sets a fixed pixel size; a viewBox lets the barcode shrink to fit the label
      const svg = ref.current;
      const w = svg.getAttribute("width");
      const h = svg.getAttribute("height");
      if (w && h) {
        svg.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.removeAttribute("width");
        svg.removeAttribute("height");
      }
      setError(false);
    } catch {
      setError(true);
    }
  }, [value]);

  if (error) return <div className="text-[1.1rem] font-bold text-red-600">Invalid barcode: {value}</div>;
  return <svg ref={ref} className="block mx-auto" style={{ width: "100%", height: "100%" }} />;
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
  const session = useSessionUser();
  const storeName: string = session?.organizationName || "";
  const value = sanitizeBarcodeValue(barcode || sku || "");

  const [size, setSize] = useState(LABEL_SIZES[0]);
  const [copies, setCopies] = useState(1);
  const [showPrice, setShowPrice] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);

  // Use the size saved on the default label printer, if any
  useEffect(() => {
    const printer = PrinterService.getPrinterFor("barcode_label");
    if (printer?.labelWidthMm && printer?.labelHeightMm) {
      setSize({ w: printer.labelWidthMm, h: printer.labelHeightMm });
    }
  }, []);

  if (!isOpen) return null;

  async function handlePrint() {
    setPrinting(true);
    setNotice("");
    setError("");
    try {
      const res = await PrinterService.printLabels({
        label: {
          storeName,
          productName,
          barcode: value,
          sku,
          price: showPrice ? price : undefined,
          weightGrams,
          expiry: expiryTime,
        },
        copies,
        element: sheetRef.current,
        widthMm: size.w,
        heightMm: size.h,
      });
      if (res.fallbackReason) setError(`${res.printerName}: ${res.fallbackReason} Printed with the system dialog instead.`);
      else setNotice(`${copies} label${copies > 1 ? "s" : ""} sent to ${res.printerName}`);
    } catch (err: any) {
      setError(err?.message || "Printing failed");
    } finally {
      setPrinting(false);
    }
  }

  const label = (
    <div
      className="bg-white text-black font-mono text-center flex flex-col items-center justify-center overflow-hidden"
      style={{ width: `${size.w}mm`, height: `${size.h}mm`, padding: "1.5mm", boxSizing: "border-box" }}
    >
      {storeName && <div className="font-bold uppercase leading-none truncate w-full" style={{ fontSize: "2.2mm" }}>{storeName}</div>}
      <div className="font-extrabold leading-tight truncate w-full" style={{ fontSize: "2.8mm" }}>
        {productName}
      </div>
      <div className="w-full flex-1 min-h-0 flex items-center justify-center" style={{ padding: "0.5mm 0" }}>
        {value ? <Barcode value={value} /> : <span style={{ fontSize: "2.5mm" }}>No barcode</span>}
      </div>
      <div className="w-full flex justify-between font-bold leading-none" style={{ fontSize: "2.4mm" }}>
        {showPrice && <span>PKR {price}</span>}
        {weightGrams ? <span>{weightGrams}g</span> : null}
        {expiryTime && <span>BB {expiryTime}</span>}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#171719] border border-[rgba(255,255,255,0.15)] w-full max-w-xl p-6 space-y-5 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#819ffe]" />
            <h3 className="font-accent font-extrabold text-[1.4rem] uppercase">Barcode Label</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview (scaled up on screen; prints at real size) */}
        <div className="bg-[#0b0b0d] border border-gray-800 p-4 flex items-center justify-center overflow-hidden">
          {/* ~270px of room; 1mm is about 3.78px on screen */}
          <div style={{ zoom: Math.min(1.6, 270 / (size.w * 3.78)) }}>{label}</div>
        </div>

        {/* Printable sheet: one page per copy */}
        <div className="hidden">
          <div ref={sheetRef}>
            {Array.from({ length: copies }, (_, i) => (
              <div key={i} className="print-page">
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[1.2rem]">
          <label className="space-y-1">
            <span className="block text-gray-400 uppercase font-accent text-[1.1rem]">Label size</span>
            <select
              value={`${size.w}x${size.h}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split("x").map(Number);
                setSize({ w, h });
              }}
              className="w-full bg-gray-900 border border-gray-700 p-2"
            >
              {[...LABEL_SIZES, ...(LABEL_SIZES.some((s) => s.w === size.w && s.h === size.h) ? [] : [size])].map((s) => (
                <option key={`${s.w}x${s.h}`} value={`${s.w}x${s.h}`}>
                  {s.w} × {s.h} mm
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-gray-400 uppercase font-accent text-[1.1rem]">Copies</span>
            <input
              type="number"
              min={1}
              max={500}
              value={copies}
              onChange={(e) => setCopies(Math.min(500, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full bg-gray-900 border border-gray-700 p-2"
            />
          </label>
          <label className="col-span-2 flex items-center gap-2 text-gray-300">
            <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
            Print price on label
          </label>
        </div>

        {notice && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-2 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {notice}
          </div>
        )}
        {error && (
          <div className="bg-amber-950/80 border border-amber-500/50 text-amber-200 p-2 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <button
          type="button"
          onClick={handlePrint}
          disabled={printing || !value}
          className="w-full btn btn-primary py-3 text-[1.3rem] flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>{printing ? "Printing..." : `Print ${copies} label${copies > 1 ? "s" : ""}`}</span>
        </button>
      </div>
    </div>
  );
}
