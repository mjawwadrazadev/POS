import { PrinterConfig, PrintOrderData, PrinterTransport } from "./types";
import { encodeEscPosReceipt } from "./escposEncoder";

const LOCAL_STORAGE_KEY = "rst_pos_printers_config";

export class PrinterService {
  /**
   * Retrieves saved printers from local storage settings.
   */
  static getSavedPrinters(): PrinterConfig[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Saves a new printer config or updates an existing one.
   */
  static savePrinter(printer: PrinterConfig): PrinterConfig[] {
    const existing = this.getSavedPrinters();
    const updated = existing.filter((p) => p.id !== printer.id);
    updated.push(printer);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  }

  /**
   * Removes a printer config by ID.
   */
  static removePrinter(printerId: string): PrinterConfig[] {
    const existing = this.getSavedPrinters();
    const updated = existing.filter((p) => p.id !== printerId);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  }

  /**
   * Pairs a new USB or Bluetooth ESC/POS printer using browser APIs.
   */
  static async pairNewDevice(
    transport: "usb" | "bluetooth",
    nameCustom?: string,
    role: "receipt" | "kitchen" | "barcode_label" = "receipt"
  ): Promise<PrinterConfig> {
    if (typeof window === "undefined") {
      throw new Error("Browser environment required for device pairing");
    }

    if (transport === "usb") {
      if (!("usb" in navigator)) {
        throw new Error("WebUSB API is not supported in this browser.");
      }
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      await device.open();
      const config: PrinterConfig = {
        id: `usb-${device.vendorId}-${device.productId}`,
        name: nameCustom || device.productName || `USB Printer (${device.vendorId})`,
        transport: "usb",
        paperWidth: "80mm",
        role,
        connected: true,
      };
      this.savePrinter(config);
      return config;
    }

    if (transport === "bluetooth") {
      if (!("bluetooth" in navigator)) {
        throw new Error("Web Bluetooth API is not supported in this browser.");
      }
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"], // Standard ESC/POS BT Service
      });
      const config: PrinterConfig = {
        id: `bt-${device.id}`,
        name: nameCustom || device.name || "Bluetooth Thermal Printer",
        transport: "bluetooth",
        paperWidth: "80mm",
        role,
        connected: true,
      };
      this.savePrinter(config);
      return config;
    }

    throw new Error("Invalid transport specified");
  }

  /**
   * Main print execution method. Dispatches to WebUSB, Bluetooth, Network relay, or browser fallback.
   */
  static async print(order: PrintOrderData, targetPrinter?: PrinterConfig): Promise<{ success: boolean; transportUsed: PrinterTransport }> {
    const printers = this.getSavedPrinters();
    const printer = targetPrinter || printers.find((p) => p.role === "receipt") || {
      id: "fallback-browser",
      name: "Browser System Print",
      transport: "browser_fallback",
      paperWidth: "80mm",
      role: "receipt",
    };

    const escPosBytes = encodeEscPosReceipt({
      ...order,
      paperWidth: printer.paperWidth,
    });

    try {
      if (printer.transport === "usb" && "usb" in navigator) {
        const devices = await (navigator as any).usb.getDevices();
        if (devices.length > 0) {
          const device = devices[0];
          await device.open();
          if (device.configuration === null) {
            await device.selectConfiguration(1);
          }
          await device.claimInterface(0);
          const endpointNumber = device.configuration.interfaces[0].alternate.endpoints.find(
            (e: any) => e.direction === "out"
          )?.endpointNumber || 1;
          await device.transferOut(endpointNumber, escPosBytes);
          return { success: true, transportUsed: "usb" };
        }
      }

      if (printer.transport === "bluetooth" && "bluetooth" in navigator) {
        // Bluetooth print attempt
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
        const characteristic = await service.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb");
        await characteristic.writeValue(escPosBytes);
        return { success: true, transportUsed: "bluetooth" };
      }

      if (printer.transport === "network" && printer.ipAddress) {
        // Local network relay attempt
        await fetch(`http://localhost:9200/print`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: escPosBytes as any,
        });
        return { success: true, transportUsed: "network" };
      }
    } catch (err) {
      console.warn("Hardware direct print failed, falling back to window.print()", err);
    }

    // Seamless Fallback to Browser Print
    if (typeof window !== "undefined") {
      window.print();
    }
    return { success: true, transportUsed: "browser_fallback" };
  }
}
