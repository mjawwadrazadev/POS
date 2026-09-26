"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer, X, CheckCircle2, Share2 } from "lucide-react";
import { PrinterService } from "@/lib/printer/PrinterService";

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
  taxRate?: number;
  // FBR fiscal invoice (stores reporting to FBR only)
  fbrStatus?: "pending" | "reported" | "failed";
  fbrInvoiceNumber?: string;
  fbrSandbox?: boolean;
  // Hospital Consultation Specific Props
  isHospitalBill?: boolean;
  perchiNumber?: number;
  consultationTime?: string;
  doctorName?: string;
  doctorSpecialization?: string;
  visitType?: string;
  patientPhone?: string;
  patientAge?: number;
  patientGender?: string;
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
  taxRate,
  fbrStatus,
  fbrInvoiceNumber,
  fbrSandbox,
  isHospitalBill,
  perchiNumber,
  consultationTime,
  doctorName,
  doctorSpecialization,
  visitType,
  patientPhone,
  patientAge,
  patientGender,
}: ThermalReceiptModalProps) {
  const [printing, setPrinting] = useState(false);
  const [printNotice, setPrintNotice] = useState("");
  const [fbrQr, setFbrQr] = useState("");

  // QR code of the FBR invoice number, so customers can verify the invoice
  useEffect(() => {
    if (!isOpen || !fbrInvoiceNumber) {
      setFbrQr("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(fbrInvoiceNumber, { margin: 1, width: 160 })
      .then((url) => !cancelled && setFbrQr(url))
      .catch(() => !cancelled && setFbrQr(""));
    return () => {
      cancelled = true;
    };
  }, [isOpen, fbrInvoiceNumber]);

  if (!isOpen) return null;

  async function handleHardwarePrint() {
    setPrinting(true);
    setPrintNotice("");

    try {
      const res = await PrinterService.print({
        orderNumber,
        dateStr: dateStr || new Date().toLocaleString(),
        cashierName,
        customerName,
        branchName,
        items,
        subtotal,
        taxAmount,
        discountTotal,
        grandTotal,
        paymentMethod,
        taxRate,
        fbrInvoiceNumber,
        fbrSandbox,
      });

      setPrintNotice(`Printed via ${res.transportUsed.toUpperCase()}`);
      setTimeout(() => setPrintNotice(""), 3000);
    } catch (err: any) {
      console.warn("Hardware print error, opening fallback print window", err);
      window.print();
    } finally {
      setPrinting(false);
    }
  }

  const whatsappMessage = encodeURIComponent(
    isHospitalBill
      ? `*RST HOSPITAL CONSULTATION PERCHI*\nPerchi #: ${perchiNumber}\nDoctor: ${doctorName}\nPatient: ${customerName}\nFee: PKR ${grandTotal}\nDate & Time: ${dateStr} ${consultationTime || ""}`
      : `*RST POS RECEIPT*\nOrder #: ${orderNumber}\nTotal: PKR ${grandTotal}\nThank you for visiting ${branchName}!`
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#171719] border border-[rgba(255,255,255,0.15)] w-full max-w-md p-6 space-y-6 text-white shadow-2xl">
        {/* Modal Controls */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-3">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#819ffe]" />
            <h3 className="font-accent font-extrabold text-[1.4rem] uppercase">
              {isHospitalBill ? "Consultation Perchi (80mm)" : "ESC/POS Thermal Receipt (80mm)"}
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

        {printNotice && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-2 text-xs font-mono text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{printNotice}</span>
          </div>
        )}

        {/* 80mm Receipt Formatting Box (Monospace Styled) */}
        <div
          id="receipt-print-area"
          className="bg-white text-black p-6 font-mono text-[1.2rem] leading-tight border border-gray-300 shadow-inner space-y-3"
        >
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="font-bold text-[1.6rem] uppercase tracking-wider">
              {isHospitalBill ? "RST HOSPITAL & MEDICAL CENTER" : "RST ENTERPRISE POS"}
            </h2>
            <p className="text-[1.1rem]">{branchName}</p>
            <p className="text-[1rem] text-gray-700">TEL: +92 42 111 778 778</p>
            <div className="border-b border-dashed border-black my-2" />
          </div>

          {isHospitalBill ? (
            /* Hospital Consultation Perchi Layout */
            <div className="space-y-3 text-[1.1rem]">
              <div className="bg-black text-white text-center py-1 font-bold text-[1.5rem] tracking-widest my-1">
                PERCHI #: {perchiNumber || 1}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Receipt #:</span>
                  <span className="font-bold">{orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span>{dateStr} {consultationTime || ""}</span>
                </div>
                <div className="flex justify-between">
                  <span>Receptionist:</span>
                  <span>{cashierName}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-black my-2" />

              <div className="space-y-1 bg-gray-100 p-2 border border-gray-300">
                <div className="font-bold text-[1.3rem] text-blue-900">{doctorName}</div>
                <div className="text-[1.1rem] font-semibold text-gray-700">{doctorSpecialization}</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Patient Name:</span>
                  <span className="font-bold">{customerName}</span>
                </div>
                {patientPhone && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span>{patientPhone}</span>
                  </div>
                )}
                {(patientAge || patientGender) && (
                  <div className="flex justify-between">
                    <span>Age / Gender:</span>
                    <span>{patientAge || "N/A"} Yrs / {patientGender || "N/A"}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Visit Type:</span>
                  <span className="font-bold uppercase text-emerald-800">{visitType?.replace("_", " ")}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-black my-2" />

              <div className="space-y-1">
                <div className="flex justify-between text-[1.3rem] font-bold">
                  <span>Consultation Fee:</span>
                  <span>PKR {grandTotal}</span>
                </div>
                <div className="flex justify-between text-[1.1rem]">
                  <span>Payment Mode:</span>
                  <span className="font-bold uppercase">{paymentMethod}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-black my-2" />

              <div className="text-center space-y-1 pt-1">
                <p className="text-[1.1rem] font-bold uppercase italic">
                  Get Well Soon! Please wait for your turn.
                </p>
                <p className="text-[0.9rem] text-gray-600">Software Powered by NIB IT Solutions</p>
              </div>
            </div>
          ) : (
            /* General POS Receipt Layout */
            <>
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
                  <span>Sales Tax{taxRate !== undefined ? ` (${taxRate}%)` : ""}:</span>
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

              {/* FBR fiscal invoice */}
              {fbrInvoiceNumber ? (
                <div className="text-center space-y-1 py-1">
                  <div className="font-extrabold text-[1.2rem] uppercase">
                    {fbrSandbox ? "FBR Sandbox — Test Invoice" : "FBR POS Invoice"}
                  </div>
                  <div className="font-mono text-[1.1rem] break-all">FBR Inv #: {fbrInvoiceNumber}</div>
                  {fbrQr && (
                    // eslint-disable-next-line @next/next/no-img-element -- generated data URL, nothing to optimise
                    <img src={fbrQr} alt={`QR code for FBR invoice ${fbrInvoiceNumber}`} className="mx-auto w-32 h-32" />
                  )}
                  <div className="text-[1rem]">Verify via FBR Tax Asaan app</div>
                  <div className="border-b border-dashed border-black my-2" />
                </div>
              ) : (
                fbrStatus &&
                fbrStatus !== "reported" && (
                  <div className="text-center text-[1rem] font-bold uppercase py-1">
                    FBR reporting pending — invoice will be resent
                    <div className="border-b border-dashed border-black my-2" />
                  </div>
                )
              )}

              {/* Footer */}
              <div className="text-center space-y-2 pt-1">
                <div className="font-bold text-[1.2rem] font-mono">{orderNumber}</div>
                <p className="text-[1rem] uppercase font-bold">
                  Software Powered by NIB IT Solutions
                </p>
                <p className="text-[0.9rem] italic">Thank you for shopping with us!</p>
              </div>
            </>
          )}
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
            <span>WhatsApp Perchi</span>
          </a>

          <button
            type="button"
            disabled={printing}
            onClick={handleHardwarePrint}
            className="btn btn-primary py-3 text-[1.2rem] flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>{printing ? "Printing..." : "Print Perchi"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
