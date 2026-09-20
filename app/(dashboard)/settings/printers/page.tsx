"use client";

import { useState, useEffect } from "react";
import { PrinterConfig, PrinterRole, PrinterPaperWidth } from "@/lib/printer/types";
import { PrinterService } from "@/lib/printer/PrinterService";
import {
  Printer,
  Plus,
  Wifi,
  Bluetooth,
  Usb,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Play,
  RefreshCw,
} from "lucide-react";

export default function PrinterSettingsPage() {
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [isAddNetworkModalOpen, setIsAddNetworkModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Network printer form
  const [netName, setNetName] = useState("Counter Network Printer");
  const [netIp, setNetIp] = useState("192.168.1.100");
  const [netPort, setNetPort] = useState(9100);
  const [netWidth, setNetWidth] = useState<PrinterPaperWidth>("80mm");
  const [netRole, setNetRole] = useState<PrinterRole>("receipt");

  useEffect(() => {
    loadPrinters();
  }, []);

  const loadPrinters = () => {
    const list = PrinterService.getSavedPrinters();
    setPrinters(list);
  };

  const handlePairDevice = async (transport: "usb" | "bluetooth") => {
    setStatusMsg("");
    setErrorMsg("");
    setLoading(true);
    try {
      const paired = await PrinterService.pairNewDevice(transport);
      setStatusMsg(`Successfully paired printer "${paired.name}" via ${transport.toUpperCase()}!`);
      loadPrinters();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to pair ${transport} printer.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNetworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: PrinterConfig = {
      id: `net-${Date.now()}`,
      name: netName,
      transport: "network",
      paperWidth: netWidth,
      ipAddress: netIp,
      port: netPort,
      role: netRole,
      connected: true,
    };

    PrinterService.savePrinter(config);
    setStatusMsg(`Saved network printer "${netName}" (${netIp}:${netPort})!`);
    setIsAddNetworkModalOpen(false);
    loadPrinters();
  };

  const handleRemovePrinter = (id: string) => {
    PrinterService.removePrinter(id);
    loadPrinters();
  };

  const handleTestPrint = async (printer: PrinterConfig) => {
    setStatusMsg("");
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await PrinterService.print(
        {
          orderNumber: "TEST-8899",
          dateStr: new Date().toLocaleString(),
          cashierName: "System Test",
          branchName: "Hardware Test Lab",
          items: [
            { name: "Thermal Receipt Test Item 1", quantity: 1, unitPrice: 500, total: 500 },
            { name: "Hardware Connection Test 2", quantity: 2, unitPrice: 250, total: 500 },
          ],
          subtotal: 1000,
          taxAmount: 160,
          discountTotal: 0,
          grandTotal: 1160,
          paymentMethod: "cash",
          paperWidth: printer.paperWidth,
        },
        printer
      );

      setStatusMsg(`Test print sent to "${printer.name}" via ${res.transportUsed.toUpperCase()}!`);
    } catch (err: any) {
      setErrorMsg(`Test print error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0b0b0d] border border-gray-800 p-6 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-400 uppercase tracking-widest mb-1">
            <Printer className="w-4 h-4" /> Hardware & Peripheral Connect
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-white">
            Universal ESC/POS Thermal Printer Settings
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage WebUSB, Web Bluetooth, and Network IP thermal printers with auto ESC/POS receipt cut.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handlePairDevice("usb")}
            className="flex items-center gap-2 bg-[#002bba] hover:bg-blue-700 text-white text-xs font-mono px-3.5 py-2 uppercase tracking-wider transition font-bold"
          >
            <Usb className="w-4 h-4" /> Pair WebUSB
          </button>
          <button
            onClick={() => handlePairDevice("bluetooth")}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-mono px-3.5 py-2 uppercase tracking-wider transition font-bold"
          >
            <Bluetooth className="w-4 h-4" /> Pair Bluetooth
          </button>
          <button
            onClick={() => setIsAddNetworkModalOpen(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono px-3.5 py-2 border border-gray-700 transition"
          >
            <Wifi className="w-4 h-4" /> Add Network IP
          </button>
        </div>
      </div>

      {/* Messages */}
      {statusMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-4 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{statusMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-4 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Saved Printers List */}
      <div className="bg-[#0b0b0d] border border-gray-800 overflow-hidden font-mono text-xs">
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-400" /> Connected & Configured Printers ({printers.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/80 text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <th className="p-4">Printer Name</th>
                <th className="p-4">Transport</th>
                <th className="p-4">Paper Width</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {printers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No hardware printers paired yet. System currently uses browser print fallback (`window.print()`).
                  </td>
                </tr>
              ) : (
                printers.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-900/40 transition">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      {p.transport === "usb" && <Usb className="w-4 h-4 text-blue-400" />}
                      {p.transport === "bluetooth" && <Bluetooth className="w-4 h-4 text-blue-400" />}
                      {p.transport === "network" && <Wifi className="w-4 h-4 text-blue-400" />}
                      <span>{p.name}</span>
                    </td>
                    <td className="p-4 uppercase font-bold text-gray-300">
                      {p.transport} {p.ipAddress ? `(${p.ipAddress}:${p.port})` : ""}
                    </td>
                    <td className="p-4 text-gray-300">{p.paperWidth}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase">
                        {p.role} PRINTER
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                        Ready
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={loading}
                          onClick={() => handleTestPrint(p)}
                          className="bg-[#002bba] hover:bg-blue-700 text-white px-3 py-1 uppercase font-bold tracking-wider flex items-center gap-1 text-[11px]"
                        >
                          <Play className="w-3 h-3" /> Test Print
                        </button>
                        <button
                          onClick={() => handleRemovePrinter(p.id)}
                          className="bg-gray-800 hover:bg-rose-950 text-rose-300 border border-rose-800 px-2.5 py-1 uppercase text-[11px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD NETWORK PRINTER MODAL */}
      {isAddNetworkModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[130] flex items-center justify-center p-4">
          <div className="bg-[#0b0b0d] border border-blue-500/50 w-full max-w-md p-6 text-white space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-bold text-blue-400 text-sm uppercase tracking-wider flex items-center gap-2">
                <Wifi className="w-4 h-4" /> Add Network Thermal Printer
              </h3>
              <button onClick={() => setIsAddNetworkModalOpen(false)} className="text-gray-400 hover:text-white">
                [Close]
              </button>
            </div>

            <form onSubmit={handleAddNetworkSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 uppercase tracking-wider mb-1">Printer Display Name</label>
                <input
                  type="text"
                  value={netName}
                  onChange={(e) => setNetName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 uppercase tracking-wider mb-1">Printer IP Address</label>
                  <input
                    type="text"
                    value={netIp}
                    onChange={(e) => setNetIp(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 uppercase tracking-wider mb-1">TCP Port</label>
                  <input
                    type="number"
                    value={netPort}
                    onChange={(e) => setNetPort(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 uppercase tracking-wider mb-1">Paper Roll Width</label>
                  <select
                    value={netWidth}
                    onChange={(e) => setNetWidth(e.target.value as PrinterPaperWidth)}
                    className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none"
                  >
                    <option value="80mm">80mm (Standard POS)</option>
                    <option value="58mm">58mm (Mobile POS)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 uppercase tracking-wider mb-1">Printer Role</label>
                  <select
                    value={netRole}
                    onChange={(e) => setNetRole(e.target.value as PrinterRole)}
                    className="w-full bg-gray-900 border border-gray-700 text-white p-2.5 outline-none"
                  >
                    <option value="receipt">Receipt Printer</option>
                    <option value="kitchen">Kitchen Printer</option>
                    <option value="barcode_label">Barcode Label Printer</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddNetworkModalOpen(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#002bba] hover:bg-blue-700 text-white px-5 py-2 uppercase font-bold"
                >
                  Save Network Printer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
