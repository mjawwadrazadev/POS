import type { LabelData, PrinterConfig, PrinterRole, PrintOrderData } from "./types";
import { encodeEscPosReceipt, encodeLabel } from "./escposEncoder";
import { printElement, sendBluetooth, sendNetwork, sendSerial, sendUsb } from "./transports";

const LOCAL_STORAGE_KEY = "rst_pos_printers_config";

export type PrintResult = {
  /** How the job actually went out */
  via: PrinterConfig["transport"];
  printerName: string;
  /** Set when the chosen printer failed and the system print dialog was used instead */
  fallbackReason?: string;
};

/** Printers are configured per terminal (browser), because each counter has its own hardware. */
export class PrinterService {
  static getSavedPrinters(): PrinterConfig[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const list: PrinterConfig[] = stored ? JSON.parse(stored) : [];
      // Older saves used "browser_fallback" for the system dialog
      return list.map((p) => ((p.transport as string) === "browser_fallback" ? { ...p, transport: "system" } : p));
    } catch {
      return [];
    }
  }

  private static write(list: PrinterConfig[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // storage full or blocked: the printer works for this session only
    }
  }

  static savePrinter(printer: PrinterConfig): PrinterConfig[] {
    let list = this.getSavedPrinters().filter((p) => p.id !== printer.id);
    // Only one default printer per role
    if (printer.isDefault) list = list.map((p) => (p.role === printer.role ? { ...p, isDefault: false } : p));
    list.push(printer);
    this.write(list);
    return list;
  }

  static removePrinter(printerId: string): PrinterConfig[] {
    const list = this.getSavedPrinters().filter((p) => p.id !== printerId);
    this.write(list);
    return list;
  }

  /** The printer to use for a job: the role's default, else any printer with that role. Kitchen tickets fall back to the receipt printer. */
  static getPrinterFor(role: PrinterRole): PrinterConfig | null {
    const list = this.getSavedPrinters();
    const forRole = (r: PrinterRole) => list.find((p) => p.role === r && p.isDefault) ?? list.find((p) => p.role === r);
    return forRole(role) ?? (role === "kitchen" ? forRole("receipt") : null) ?? null;
  }

  /** Sends raw bytes over the printer's own transport. */
  static async sendRaw(printer: PrinterConfig, data: Uint8Array) {
    switch (printer.transport) {
      case "usb":
        return sendUsb(printer, data);
      case "serial":
        return sendSerial(printer, data);
      case "bluetooth":
        return sendBluetooth(printer, data);
      case "network":
        return sendNetwork(printer, data);
      default:
        throw new Error("This printer uses the system print dialog");
    }
  }

  /**
   * Prints a receipt. Raw printers get ESC/POS; system printers (and any raw printer that fails)
   * print the on-screen receipt element through the print dialog.
   */
  static async printReceipt(opts: {
    order: PrintOrderData;
    element?: HTMLElement | null;
    printer?: PrinterConfig | null;
    role?: PrinterRole;
  }): Promise<PrintResult> {
    const printer = opts.printer ?? this.getPrinterFor(opts.role ?? "receipt");
    const paperWidth = printer?.paperWidth ?? "80mm";
    let fallbackReason: string | undefined;

    if (printer && printer.transport !== "system") {
      try {
        const bytes = encodeEscPosReceipt({ ...opts.order, paperWidth, openCashDrawer: printer.openCashDrawer });
        await this.sendRaw(printer, bytes);
        return { via: printer.transport, printerName: printer.name };
      } catch (err) {
        fallbackReason = err instanceof Error ? err.message : String(err);
      }
    }

    if (!opts.element) throw new Error(fallbackReason || "Nothing to print");
    await printElement(opts.element, { widthMm: paperWidth === "58mm" ? 58 : 80, marginMm: 2 });
    return { via: "system", printerName: printer?.name ?? "System printer", fallbackReason };
  }

  /** Prints barcode labels, as raw ESC/POS, TSPL or ZPL, or through the print dialog. */
  static async printLabels(opts: {
    label: LabelData;
    copies: number;
    element?: HTMLElement | null;
    printer?: PrinterConfig | null;
    widthMm: number;
    heightMm: number;
  }): Promise<PrintResult> {
    const printer = opts.printer ?? this.getPrinterFor("barcode_label");
    let fallbackReason: string | undefined;

    if (printer && printer.transport !== "system") {
      try {
        const sized = { ...printer, labelWidthMm: opts.widthMm, labelHeightMm: opts.heightMm };
        await this.sendRaw(printer, encodeLabel(opts.label, opts.copies, sized));
        return { via: printer.transport, printerName: printer.name };
      } catch (err) {
        fallbackReason = err instanceof Error ? err.message : String(err);
      }
    }

    if (!opts.element) throw new Error(fallbackReason || "Nothing to print");
    await printElement(opts.element, { widthMm: opts.widthMm, heightMm: opts.heightMm });
    return { via: "system", printerName: printer?.name ?? "System printer", fallbackReason };
  }
}
