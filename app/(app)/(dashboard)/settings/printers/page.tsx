"use client";

import { useEffect, useRef, useState } from "react";
import {
  Printer,
  Wifi,
  Bluetooth,
  Usb,
  Cable,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Play,
  Star,
  ScanBarcode,
  Camera,
  Plus,
  X,
} from "lucide-react";
import { PageActions } from "@/components/layout/PageActions";
import type { PrinterConfig, PrinterLanguage, PrinterPaperWidth, PrinterRole, PrinterTransport } from "@/lib/printer/types";
import { PrinterService } from "@/lib/printer/PrinterService";
import {
  checkPrintBridge,
  requestBluetoothPrinter,
  requestSerialPort,
  requestUsbPrinter,
  transportSupport,
} from "@/lib/printer/transports";
import { getSerialScanner, saveSerialScanner, type SerialScannerConfig } from "@/lib/scanner/scannerConfig";
import { BarcodeScannerListener } from "@/components/pos/BarcodeScannerListener";
import { SerialScannerListener } from "@/components/pos/SerialScannerListener";
import { CameraBarcodeScannerModal } from "@/components/pos/CameraBarcodeScannerModal";
import { useSessionUser } from "@/components/layout/SessionContext";

const TRANSPORTS: { value: PrinterTransport; label: string; hint: string; icon: typeof Usb }[] = [
  {
    value: "system",
    label: "System printer (recommended)",
    hint: "Any printer installed in Windows/Mac/Android — USB, Bluetooth, Wi-Fi, network, A4 or label. Uses the print dialog.",
    icon: Monitor,
  },
  {
    value: "usb",
    label: "USB (direct, no driver)",
    hint: "Raw ESC/POS over USB for thermal printers without a Windows driver. Chrome/Edge only.",
    icon: Usb,
  },
  {
    value: "serial",
    label: "Serial / Bluetooth COM port",
    hint: "USB printers that show as a COM port, and classic Bluetooth printers paired in Windows. Chrome/Edge only.",
    icon: Cable,
  },
  {
    value: "bluetooth",
    label: "Bluetooth LE",
    hint: "Portable BLE thermal printers. Chrome/Edge, Android Chrome.",
    icon: Bluetooth,
  },
  {
    value: "network",
    label: "Network / Wi-Fi (IP address)",
    hint: "LAN printers on port 9100. Needs the RST print bridge running on this computer.",
    icon: Wifi,
  },
];

const ROLE_LABELS: Record<PrinterRole, string> = {
  receipt: "Receipt",
  kitchen: "Kitchen (KOT)",
  barcode_label: "Barcode labels",
};

const TRANSPORT_ICONS: Record<PrinterTransport, typeof Usb> = {
  system: Monitor,
  usb: Usb,
  serial: Cable,
  bluetooth: Bluetooth,
  network: Wifi,
};

type Draft = {
  name: string;
  transport: PrinterTransport;
  role: PrinterRole;
  paperWidth: PrinterPaperWidth;
  language: PrinterLanguage;
  labelWidthMm: number;
  labelHeightMm: number;
  openCashDrawer: boolean;
  isDefault: boolean;
  ipAddress: string;
  port: number;
  baudRate: number;
  device?: Partial<PrinterConfig>;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  transport: "system",
  role: "receipt",
  paperWidth: "80mm",
  language: "escpos",
  labelWidthMm: 50,
  labelHeightMm: 30,
  openCashDrawer: false,
  isDefault: true,
  ipAddress: "192.168.1.100",
  port: 9100,
  baudRate: 9600,
};

const inputClass = "w-full bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] text-white text-[1.4rem] p-2.5 outline-none focus:border-[#819ffe]";
const labelClass = "block font-accent text-gray-300 uppercase font-semibold mb-1.5 text-[1.15rem]";

export default function PrinterSettingsPage() {
  const session = useSessionUser();
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [bridgeOnline, setBridgeOnline] = useState<boolean | null>(null);
  const [support, setSupport] = useState({ usb: false, serial: false, bluetooth: false });

  // Scanner test
  const [lastScan, setLastScan] = useState<{ code: string; source: string; at: string } | null>(null);
  const [serialScanner, setSerialScanner] = useState<SerialScannerConfig | null>(null);
  const [scannerBaud, setScannerBaud] = useState(9600);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [serialListenerKey, setSerialListenerKey] = useState(0);

  const testReceiptRef = useRef<HTMLDivElement>(null);
  const testLabelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrinters(PrinterService.getSavedPrinters());
    setSerialScanner(getSerialScanner());
    setSupport({ usb: transportSupport.usb(), serial: transportSupport.serial(), bluetooth: transportSupport.bluetooth() });
  }, []);

  // Only check the bridge when a network printer is configured or being added
  const needsBridge = printers.some((p) => p.transport === "network") || draft?.transport === "network";
  useEffect(() => {
    if (!needsBridge) return;
    let cancelled = false;
    const check = () => checkPrintBridge().then((ok) => !cancelled && setBridgeOnline(ok));
    check();
    const id = setInterval(check, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [needsBridge]);

  const say = (ok: string, err = "") => {
    setStatusMsg(ok);
    setErrorMsg(err);
  };

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const pickDevice = async () => {
    if (!draft) return;
    say("");
    try {
      if (draft.transport === "usb") {
        const d = await requestUsbPrinter();
        update({ device: d, name: draft.name || d.name });
      } else if (draft.transport === "serial") {
        const d = await requestSerialPort();
        update({
          device: { usbVendorId: d.usbVendorId, usbProductId: d.usbProductId },
          name: draft.name || (d.usbVendorId ? `COM printer ${d.usbVendorId}:${d.usbProductId}` : "Bluetooth COM printer"),
        });
      } else if (draft.transport === "bluetooth") {
        const d = await requestBluetoothPrinter();
        update({ device: d, name: draft.name || d.name });
      }
    } catch (err: any) {
      if (err?.name !== "NotFoundError") say("", err?.message || "No device selected");
    }
  };

  const needsDevice = draft && ["usb", "serial", "bluetooth"].includes(draft.transport);

  const savePrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (needsDevice && !draft.device) {
      say("", "Choose the device first.");
      return;
    }
    const config: PrinterConfig = {
      id: `${draft.transport}-${Date.now()}`,
      name: draft.name.trim() || TRANSPORTS.find((t) => t.value === draft.transport)!.label.replace(/ \(.*\)$/, ""),
      transport: draft.transport,
      role: draft.role,
      paperWidth: draft.paperWidth,
      language: draft.role === "barcode_label" ? draft.language : "escpos",
      labelWidthMm: draft.role === "barcode_label" ? draft.labelWidthMm : undefined,
      labelHeightMm: draft.role === "barcode_label" ? draft.labelHeightMm : undefined,
      openCashDrawer: draft.role === "receipt" && draft.transport !== "system" ? draft.openCashDrawer : undefined,
      isDefault: draft.isDefault,
      ipAddress: draft.transport === "network" ? draft.ipAddress.trim() : undefined,
      port: draft.transport === "network" ? draft.port : undefined,
      baudRate: draft.transport === "serial" ? draft.baudRate : undefined,
      ...(draft.device || {}),
    };
    // name from the device must not override what the user typed
    config.name = draft.name.trim() || config.name;
    setPrinters(PrinterService.savePrinter(config));
    setDraft(null);
    say(`Saved "${config.name}". Use Test Print to check it.`);
  };

  const makeDefault = (p: PrinterConfig) => setPrinters(PrinterService.savePrinter({ ...p, isDefault: true }));

  const removePrinter = (id: string) => setPrinters(PrinterService.removePrinter(id));

  const testPrint = async (printer: PrinterConfig) => {
    say("");
    setBusy(true);
    try {
      const res =
        printer.role === "barcode_label"
          ? await PrinterService.printLabels({
              printer,
              copies: 1,
              element: testLabelRef.current,
              widthMm: printer.labelWidthMm || 50,
              heightMm: printer.labelHeightMm || 30,
              label: { storeName: session?.organizationName, productName: "Test Label", barcode: "8964000000014", price: 250 },
            })
          : await PrinterService.printReceipt({
              printer,
              element: testReceiptRef.current,
              order: {
                orderNumber: "TEST-0001",
                dateStr: new Date().toLocaleString(),
                cashierName: session?.name || "Test",
                storeName: session?.organizationName || "RST POS",
                branchName: "Printer test",
                items: [
                  { name: "Test item one", quantity: 1, unitPrice: 500, total: 500 },
                  { name: "Test item with a much longer name", quantity: 2, unitPrice: 250, total: 500 },
                ],
                subtotal: 1000,
                taxAmount: 160,
                taxRate: 16,
                discountTotal: 0,
                grandTotal: 1160,
                paymentMethod: "cash",
              },
            });
      if (res.fallbackReason) say("", `${res.fallbackReason} (the system print dialog was used instead)`);
      else say(`Test sent to "${res.printerName}" via ${res.via.toUpperCase()}.`);
    } catch (err: any) {
      say("", err?.message || "Test print failed");
    } finally {
      setBusy(false);
    }
  };

  // ── scanners ──
  const recordScan = (source: string) => (code: string) =>
    setLastScan({ code, source, at: new Date().toLocaleTimeString() });

  const connectSerialScanner = async () => {
    say("");
    try {
      const d = await requestSerialPort();
      const config: SerialScannerConfig = {
        name: d.usbVendorId ? `COM scanner ${d.usbVendorId}:${d.usbProductId}` : "Bluetooth COM scanner",
        usbVendorId: d.usbVendorId,
        usbProductId: d.usbProductId,
        baudRate: scannerBaud,
      };
      saveSerialScanner(config);
      setSerialScanner(config);
      setSerialListenerKey((k) => k + 1);
      say(`Serial scanner connected. Scan a barcode to test it.`);
    } catch (err: any) {
      if (err?.name !== "NotFoundError") say("", err?.message || "No scanner selected");
    }
  };

  const disconnectSerialScanner = () => {
    saveSerialScanner(null);
    setSerialScanner(null);
    setSerialListenerKey((k) => k + 1);
  };

  const transportInfo = draft ? TRANSPORTS.find((t) => t.value === draft.transport)! : null;
  const unsupported = (t: PrinterTransport) =>
    (t === "usb" && !support.usb) || (t === "serial" && !support.serial) || (t === "bluetooth" && !support.bluetooth);

  return (
    <div className="space-y-6">
      {/* Keyboard + serial scanners feed the test panel while this page is open */}
      <BarcodeScannerListener onScan={recordScan("USB / Bluetooth keyboard scanner")} />
      <SerialScannerListener key={serialListenerKey} onScan={recordScan("Serial COM scanner")} />

      <PageActions>
        <button
          onClick={() => {
            say("");
            setDraft({ ...EMPTY_DRAFT });
          }}
          className="btn btn-primary py-2.5 px-5 text-[1.3rem]"
        >
          <Plus className="w-4 h-4" /> Add printer
        </button>
      </PageActions>

      <p className="text-[1.35rem] text-medium max-w-[80rem]">
        Printers are saved on this computer or tablet only, so every counter can use its own hardware. Any printer
        installed in the operating system works through &quot;System printer&quot;.
      </p>

      {statusMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 px-4 py-3 text-[1.35rem]">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 px-4 py-3 text-[1.35rem]">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Print bridge status */}
      {needsBridge && (
        <div
          className={`border px-4 py-3 flex items-start gap-3 text-[1.35rem] ${
            bridgeOnline ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700" : "bg-amber-500/10 border-amber-500/30 text-amber-700"
          }`}
        >
          <Wifi className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div className="font-bold">
              Print bridge: {bridgeOnline === null ? "checking…" : bridgeOnline ? "running" : "not running"}
            </div>
            {!bridgeOnline && (
              <p>
                Network printers need the RST print bridge on this computer. In the POS folder run{" "}
                <code className="bg-black/5 border border-black/10 px-1.5 font-mono">npm run print-bridge</code> and keep the window open.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Printers. The empty state sits outside the table so it never scrolls sideways on phones. */}
      <div className="bg-base-bright border border-stroke-muted">
        <div className="px-5 py-4 border-b border-stroke-muted bg-base-tint">
          <h3 className="font-bold text-[1.6rem] flex items-center gap-2">
            <Printer className="w-5 h-5 text-accent" /> Printers
            <span className="text-muted font-semibold">{printers.length}</span>
          </h3>
        </div>
        {printers.length === 0 ? (
          <div className="py-14 px-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 bg-base-tint border border-stroke-muted flex items-center justify-center">
                <Printer className="w-6 h-6 text-muted" />
              </div>
              <p className="font-bold text-[1.5rem]">No printers added yet</p>
              <p className="text-muted text-[1.3rem] max-w-[44rem]">
                Receipts and labels use the system print dialog until you add one.
              </p>
              <button
                onClick={() => {
                  say("");
                  setDraft({ ...EMPTY_DRAFT });
                }}
                className="btn btn-primary py-2.5 px-5 text-[1.3rem] mt-1"
              >
                <Plus className="w-4 h-4" /> Add printer
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Printer</th>
                  <th>Connection</th>
                  <th>Used for</th>
                  <th>Paper / Label</th>
                  <th className="!text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {printers.map((p) => {
                const Icon = TRANSPORT_ICONS[p.transport] ?? Monitor;
                return (
                  <tr key={p.id}>
                    <td className="font-bold">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-accent" />
                        <span>{p.name}</span>
                        {p.isDefault && <span className="badge badge-warning">Default</span>}
                      </div>
                    </td>
                    <td className="text-medium uppercase text-[1.25rem] font-accent">
                      {p.transport}
                      {p.ipAddress ? ` (${p.ipAddress}:${p.port})` : ""}
                      {p.transport !== "system" && p.role === "barcode_label" ? ` · ${p.language}` : ""}
                    </td>
                    <td>
                      <span className="badge badge-accent">{ROLE_LABELS[p.role]}</span>
                    </td>
                    <td className="text-medium">
                      {p.role === "barcode_label" ? `${p.labelWidthMm ?? 50} × ${p.labelHeightMm ?? 30} mm` : p.paperWidth}
                      {p.openCashDrawer ? " · cash drawer" : ""}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {!p.isDefault && (
                          <button
                            onClick={() => makeDefault(p)}
                            className="btn btn-secondary py-1.5 px-3 text-[1.15rem]"
                            title="Use this printer by default for its role"
                          >
                            <Star className="w-3.5 h-3.5" /> Default
                          </button>
                        )}
                        <button
                          disabled={busy}
                          onClick={() => testPrint(p)}
                          className="btn btn-primary py-1.5 px-3 text-[1.15rem] disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5" /> Test print
                        </button>
                        <button
                          onClick={() => removePrinter(p.id)}
                          className="btn btn-secondary py-1.5 px-2.5 text-rose-600"
                          aria-label={`Remove ${p.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scanners */}
      <div className="bg-base-bright border border-stroke-muted">
        <div className="px-5 py-4 border-b border-stroke-muted bg-base-tint">
          <h3 className="font-bold text-[1.6rem] flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-accent" /> Barcode scanners
          </h3>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="border border-stroke-muted bg-base-tint p-4 flex flex-col gap-2">
              <div className="font-bold text-[1.45rem]">USB / wireless / Bluetooth</div>
              <p className="text-medium text-[1.3rem] flex-1">
                Plug-and-play. Scanners that type like a keyboard (USB, 2.4 GHz dongle, Bluetooth HID) work on every
                browser and device with no setup, with Enter, Tab or no suffix.
              </p>
              <span className="badge badge-success self-start">Always on</span>
            </div>

            <div className="border border-stroke-muted bg-base-tint p-4 flex flex-col gap-2">
              <div className="font-bold text-[1.45rem]">Serial / COM port</div>
              <p className="text-medium text-[1.3rem] flex-1">
                RS-232 scanners, USB scanners in &quot;virtual COM&quot; mode and Bluetooth SPP scanners. Chrome/Edge only.
              </p>
              {serialScanner ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-emerald-700 font-bold text-[1.3rem]">
                    {serialScanner.name} · {serialScanner.baudRate} baud
                  </span>
                  <button onClick={disconnectSerialScanner} className="btn btn-secondary py-1.5 px-3 text-[1.15rem] text-rose-600">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select value={scannerBaud} onChange={(e) => setScannerBaud(Number(e.target.value))} className="form-select py-2 w-auto">
                    {[9600, 19200, 38400, 57600, 115200].map((b) => (
                      <option key={b} value={b}>
                        {b} baud
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={!support.serial}
                    onClick={connectSerialScanner}
                    className="btn btn-primary flex-1 py-2 px-3 text-[1.2rem] disabled:opacity-40"
                  >
                    {support.serial ? "Connect" : "Needs Chrome/Edge"}
                  </button>
                </div>
              )}
            </div>

            <div className="border border-stroke-muted bg-base-tint p-4 flex flex-col gap-2">
              <div className="font-bold text-[1.45rem]">Camera</div>
              <p className="text-medium text-[1.3rem] flex-1">
                Phone, tablet or webcam. Reads EAN, UPC, Code 128/39/93, ITF, Codabar, QR and Data Matrix in every browser.
              </p>
              <button onClick={() => setCameraOpen(true)} className="btn btn-primary self-start py-2 px-4 text-[1.2rem]">
                <Camera className="w-4 h-4" /> Test camera
              </button>
            </div>
          </div>

          <div className="border border-dashed border-stroke-muted p-4">
            <div className="text-muted font-accent uppercase text-[1.15rem] font-semibold mb-1">Scanner test — scan any barcode now</div>
            {lastScan ? (
              <div className="text-[1.8rem] font-bold text-emerald-700">
                {lastScan.code}{" "}
                <span className="text-[1.2rem] text-muted font-normal">
                  via {lastScan.source} at {lastScan.at}
                </span>
              </div>
            ) : (
              <div className="text-medium text-[1.3rem]">Waiting for a scan… (click an empty area of the page first, not a text box)</div>
            )}
          </div>
        </div>
      </div>

      <CameraBarcodeScannerModal isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onScan={recordScan("Camera")} />

      {/* Hidden samples used by "Test print" on system printers */}
      <div className="hidden">
        <div ref={testReceiptRef} className="bg-white text-black p-4 font-mono text-[1.2rem] leading-tight space-y-1">
          <div className="text-center font-bold text-[1.6rem]">{session?.organizationName || "RST POS"}</div>
          <div className="text-center">Printer test</div>
          <div className="border-b border-dashed border-black my-2" />
          <div className="flex justify-between"><span>Test item one</span><span>500</span></div>
          <div className="flex justify-between"><span>Test item two x2</span><span>500</span></div>
          <div className="border-b border-dashed border-black my-2" />
          <div className="flex justify-between font-bold text-[1.4rem]"><span>TOTAL</span><span>PKR 1,160</span></div>
          <div className="text-center pt-2">If you can read this, printing works.</div>
        </div>
        <div ref={testLabelRef}>
          <div
            className="bg-white text-black font-mono text-center flex flex-col items-center justify-center"
            style={{ width: "50mm", height: "30mm", fontSize: "3mm" }}
          >
            <b>Test Label</b>
            <span>PKR 250</span>
            <span>If this fits, the label size is right.</span>
          </div>
        </div>
      </div>

      {/* Add printer */}
      {draft && transportInfo && (
        <div className="fixed inset-0 bg-black/80 z-[130] flex items-center justify-center p-4">
          <form
            onSubmit={savePrinter}
            className="bg-[#171719] border border-[rgba(255,255,255,0.12)] w-full max-w-[60rem] p-6 text-white text-[1.3rem] space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
              <h3 className="font-accent font-extrabold text-[1.5rem] uppercase flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#819ffe]" /> Add printer
              </h3>
              <button type="button" onClick={() => setDraft(null)} className="icon-btn text-gray-400 hover:text-white hover:bg-white/10" aria-label="Close">
                <X className="w-[1.8rem] h-[1.8rem]" />
              </button>
            </div>

            <div>
              <span className={labelClass}>Connection</span>
              <div className="grid grid-cols-1 gap-2">
                {TRANSPORTS.map((t) => {
                  const Icon = t.icon;
                  const off = unsupported(t.value);
                  return (
                    <label
                      key={t.value}
                      className={`flex items-start gap-3 border p-3 cursor-pointer ${
                        draft.transport === t.value ? "border-blue-500 bg-blue-500/10" : "border-gray-800"
                      } ${off ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <input
                        type="radio"
                        name="transport"
                        disabled={off}
                        checked={draft.transport === t.value}
                        onChange={() => update({ transport: t.value, device: undefined })}
                        className="mt-1"
                      />
                      <Icon className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" />
                      <span>
                        <b className="block">{t.label}</b>
                        <span className="text-gray-400">{off ? "Not available in this browser — use Chrome or Edge." : t.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {needsDevice && (
              <div className="flex items-center gap-3">
                <button type="button" onClick={pickDevice} className="btn btn-primary py-2.5 px-4 text-[1.3rem]">
                  Choose device
                </button>
                <span className={draft.device ? "text-emerald-400" : "text-gray-500"}>
                  {draft.device ? "Device selected" : "No device selected"}
                </span>
              </div>
            )}

            {draft.transport === "network" && (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelClass}>Printer IP address</label>
                  <input className={inputClass} value={draft.ipAddress} onChange={(e) => update({ ipAddress: e.target.value })} required />
                </div>
                <div>
                  <label className={labelClass}>Port</label>
                  <input type="number" className={inputClass} value={draft.port} onChange={(e) => update({ port: Number(e.target.value) })} required />
                </div>
              </div>
            )}

            {draft.transport === "serial" && (
              <div>
                <label className={labelClass}>Baud rate (usually 9600)</label>
                <select className={inputClass} value={draft.baudRate} onChange={(e) => update({ baudRate: Number(e.target.value) })}>
                  {[9600, 19200, 38400, 57600, 115200].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Name</label>
                <input className={inputClass} value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Counter 1 printer" />
              </div>
              <div>
                <label className={labelClass}>Used for</label>
                <select className={inputClass} value={draft.role} onChange={(e) => update({ role: e.target.value as PrinterRole })}>
                  <option value="receipt">Receipts</option>
                  <option value="kitchen">Kitchen tickets (KOT)</option>
                  <option value="barcode_label">Barcode labels</option>
                </select>
              </div>
            </div>

            {draft.role === "barcode_label" ? (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Label width (mm)</label>
                  <input type="number" min={20} max={120} className={inputClass} value={draft.labelWidthMm} onChange={(e) => update({ labelWidthMm: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={labelClass}>Label height (mm)</label>
                  <input type="number" min={10} max={150} className={inputClass} value={draft.labelHeightMm} onChange={(e) => update({ labelHeightMm: Number(e.target.value) })} />
                </div>
                {draft.transport !== "system" && (
                  <div>
                    <label className={labelClass}>Printer language</label>
                    <select className={inputClass} value={draft.language} onChange={(e) => update({ language: e.target.value as PrinterLanguage })}>
                      <option value="tspl">TSPL (TSC, Xprinter)</option>
                      <option value="zpl">ZPL (Zebra)</option>
                      <option value="escpos">ESC/POS (receipt printer)</option>
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Paper roll</label>
                  <select className={inputClass} value={draft.paperWidth} onChange={(e) => update({ paperWidth: e.target.value as PrinterPaperWidth })}>
                    <option value="80mm">80 mm</option>
                    <option value="58mm">58 mm</option>
                  </select>
                </div>
                {draft.role === "receipt" && draft.transport !== "system" && (
                  <label className="flex items-center gap-2 mt-6 text-gray-300">
                    <input type="checkbox" checked={draft.openCashDrawer} onChange={(e) => update({ openCashDrawer: e.target.checked })} />
                    Open cash drawer after receipt
                  </label>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 text-gray-300">
              <input type="checkbox" checked={draft.isDefault} onChange={(e) => update({ isDefault: e.target.checked })} />
              Default printer for {ROLE_LABELS[draft.role].toLowerCase()}
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setDraft(null)} className="btn bg-[#0b0b0d] border border-[rgba(255,255,255,0.18)] text-gray-300 hover:text-white py-2.5 px-4 text-[1.3rem]">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary py-2.5 px-5 text-[1.3rem]">
                Save printer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
