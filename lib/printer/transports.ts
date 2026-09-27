import type { PrinterConfig } from "./types";

// Low-level ways of getting bytes (or a page) to a printer. WebUSB, Web Serial and Web Bluetooth
// exist only in Chromium browsers (Chrome, Edge, Opera, Android Chrome), so each helper checks first.

/* eslint-disable @typescript-eslint/no-explicit-any -- the Web USB/Serial/Bluetooth types are not in lib.dom */
const nav = (): any => (typeof navigator === "undefined" ? {} : navigator);

export const transportSupport = {
  usb: () => "usb" in nav(),
  serial: () => "serial" in nav(),
  bluetooth: () => "bluetooth" in nav(),
};

// ─── System print (any installed printer) ──────────────────────────────

type PageSize = { widthMm: number; heightMm?: number; marginMm?: number };

/**
 * Prints one element in a hidden iframe, so only the receipt/label reaches the printer (not the whole
 * dashboard). The page's stylesheets are copied across so it looks the same as on screen.
 */
export function printElement(element: HTMLElement, page: PageSize): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      reject(new Error("Could not open the print frame"));
      return;
    }

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join("\n");
    const margin = page.marginMm ?? 0;
    const size = page.heightMm ? `${page.widthMm}mm ${page.heightMm}mm` : `${page.widthMm}mm auto`;

    doc.open();
    doc.write(`<!doctype html><html style="font-size:62.5%"><head><meta charset="utf-8">${styles}
      <style>
        @page { size: ${size}; margin: ${margin}mm; }
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; min-height: 0 !important; }
        body { width: ${page.widthMm - margin * 2}mm; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-root > * { box-shadow: none !important; border: 0 !important; max-width: none !important; width: 100% !important; margin: 0 !important; }
        .print-invert, .print-invert * { background: #fff !important; color: #000 !important; border-color: #000 !important; }
        .print-page { break-after: page; page-break-after: always; }
        .print-page:last-child { break-after: auto; page-break-after: auto; }
      </style></head><body><div class="print-root">${element.outerHTML}</div></body></html>`);
    doc.close();

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setTimeout(() => iframe.remove(), 500);
      resolve();
    };

    const run = () => {
      try {
        win.focus();
        win.addEventListener("afterprint", finish);
        win.print();
        // Some browsers never fire afterprint; print() blocks until the dialog closes anyway
        setTimeout(finish, 1000);
      } catch (err) {
        iframe.remove();
        reject(err);
      }
    };

    // Wait for copied stylesheets and images before opening the dialog
    const pending = Array.from(doc.querySelectorAll("link[rel=stylesheet], img")) as (HTMLLinkElement | HTMLImageElement)[];
    const loads = pending.map(
      (el) =>
        new Promise<void>((r) => {
          if (el instanceof HTMLImageElement && el.complete) return r();
          el.addEventListener("load", () => r(), { once: true });
          el.addEventListener("error", () => r(), { once: true });
          setTimeout(r, 2000);
        })
    );
    Promise.all(loads).then(() => setTimeout(run, 50));
  });
}

// ─── WebUSB ─────────────────────────────────────────────────────────────

/** Asks the user to pick a USB printer. Returns the identity to save. */
export async function requestUsbPrinter() {
  if (!transportSupport.usb()) throw new Error("USB printing needs Chrome or Edge on a computer.");
  const device = await nav().usb.requestDevice({ filters: [] });
  return {
    usbVendorId: device.vendorId as number,
    usbProductId: device.productId as number,
    serialNumber: (device.serialNumber as string) || undefined,
    name: (device.productName as string) || `USB printer ${device.vendorId}:${device.productId}`,
  };
}

async function findUsbDevice(printer: PrinterConfig) {
  const devices: any[] = await nav().usb.getDevices();
  return (
    devices.find(
      (d) =>
        d.vendorId === printer.usbVendorId &&
        d.productId === printer.usbProductId &&
        (!printer.serialNumber || d.serialNumber === printer.serialNumber)
    ) ?? null
  );
}

export async function sendUsb(printer: PrinterConfig, data: Uint8Array) {
  if (!transportSupport.usb()) throw new Error("USB printing needs Chrome or Edge.");
  const device = await findUsbDevice(printer);
  if (!device) throw new Error(`"${printer.name}" is not connected. Plug it in, or pair it again in Printer settings.`);

  await device.open();
  try {
    if (device.configuration === null) await device.selectConfiguration(1);

    // Find the interface with a bulk OUT endpoint (the printer's data channel), not just interface 0
    let target: { iface: number; alt: number; endpoint: number } | null = null;
    for (const iface of device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        const ep = alt.endpoints.find((e: any) => e.direction === "out" && e.type === "bulk");
        if (ep) {
          target = { iface: iface.interfaceNumber, alt: alt.alternateSetting, endpoint: ep.endpointNumber };
          break;
        }
      }
      if (target) break;
    }
    if (!target) throw new Error("This USB device has no printer data channel.");

    try {
      await device.claimInterface(target.iface);
    } catch {
      throw new Error(
        `Windows is using "${printer.name}" through its own driver. Change this printer to "System printer" in Printer settings.`
      );
    }
    if (target.alt) await device.selectAlternateInterface(target.iface, target.alt);

    const CHUNK = 16 * 1024;
    for (let i = 0; i < data.length; i += CHUNK) {
      await device.transferOut(target.endpoint, data.slice(i, i + CHUNK));
    }
    await device.releaseInterface(target.iface).catch(() => {});
  } finally {
    await device.close().catch(() => {});
  }
}

// ─── Web Serial (USB-COM and classic Bluetooth printers/scanners) ───────

export async function requestSerialPort() {
  if (!transportSupport.serial()) throw new Error("Serial (COM port) devices need Chrome or Edge on a computer.");
  const port = await nav().serial.requestPort();
  const info = port.getInfo?.() ?? {};
  return { port, usbVendorId: info.usbVendorId as number | undefined, usbProductId: info.usbProductId as number | undefined };
}

/** Finds a previously granted COM port again without prompting. */
export async function findSerialPort(ids: { usbVendorId?: number; usbProductId?: number }): Promise<any | null> {
  if (!transportSupport.serial()) return null;
  const ports: any[] = await nav().serial.getPorts();
  if (ids.usbVendorId !== undefined) {
    const match = ports.find((p) => {
      const info = p.getInfo?.() ?? {};
      return info.usbVendorId === ids.usbVendorId && info.usbProductId === ids.usbProductId;
    });
    if (match) return match;
  }
  // Bluetooth COM ports carry no USB ids; with one granted port there is no ambiguity
  const nonUsb = ports.filter((p) => (p.getInfo?.() ?? {}).usbVendorId === undefined);
  return nonUsb.length === 1 ? nonUsb[0] : ports.length === 1 ? ports[0] : null;
}

export async function sendSerial(printer: PrinterConfig, data: Uint8Array) {
  const port = await findSerialPort(printer);
  if (!port) throw new Error(`"${printer.name}" (COM port) was not found. Pair it again in Printer settings.`);
  await port.open({ baudRate: printer.baudRate || 9600 });
  try {
    const writer = port.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
  } finally {
    await port.close().catch(() => {});
  }
}

// ─── Bluetooth Low Energy ───────────────────────────────────────────────

// Write services used by common BLE thermal/label printers
const BLE_PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
];

// Devices picked in this tab; the browser only hands them out again through a prompt
const bleDevices = new Map<string, any>();

export async function requestBluetoothPrinter() {
  if (!transportSupport.bluetooth()) throw new Error("Bluetooth printing needs Chrome or Edge (or Chrome on Android).");
  const device = await nav().bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BLE_PRINTER_SERVICES });
  bleDevices.set(device.id, device);
  return { bluetoothDeviceId: device.id as string, name: (device.name as string) || "Bluetooth printer" };
}

async function getBleDevice(printer: PrinterConfig) {
  const id = printer.bluetoothDeviceId;
  if (id && bleDevices.has(id)) return bleDevices.get(id);
  // Chrome can return already-permitted devices without a prompt
  if (id && typeof nav().bluetooth.getDevices === "function") {
    const known: any[] = await nav().bluetooth.getDevices();
    const match = known.find((d) => d.id === id);
    if (match) {
      bleDevices.set(id, match);
      return match;
    }
  }
  const picked = await nav().bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: BLE_PRINTER_SERVICES });
  bleDevices.set(picked.id, picked);
  return picked;
}

export async function sendBluetooth(printer: PrinterConfig, data: Uint8Array) {
  if (!transportSupport.bluetooth()) throw new Error("Bluetooth printing needs Chrome or Edge.");
  const device = await getBleDevice(printer);
  const server = device.gatt.connected ? device.gatt : await device.gatt.connect();

  let characteristic: any = null;
  for (const uuid of BLE_PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(uuid);
      const chars: any[] = await service.getCharacteristics();
      characteristic = chars.find((c) => c.properties.writeWithoutResponse || c.properties.write);
      if (characteristic) break;
    } catch {
      // service not on this printer, try the next one
    }
  }
  if (!characteristic) {
    throw new Error(
      `"${printer.name}" has no known print service. If it is a classic Bluetooth printer, pair it in Windows and add it as "Serial / Bluetooth COM".`
    );
  }

  // BLE packets are small; send in chunks with a short pause so the printer buffer keeps up
  const CHUNK = 180;
  const noResponse = characteristic.properties.writeWithoutResponse;
  for (let i = 0; i < data.length; i += CHUNK) {
    const part = data.slice(i, i + CHUNK);
    if (noResponse) await characteristic.writeValueWithoutResponse(part);
    else await characteristic.writeValue(part);
    await new Promise((r) => setTimeout(r, 20));
  }
}

// ─── Network printers through the local print bridge ───────────────────

export const PRINT_BRIDGE_URL = "http://127.0.0.1:9200";

export async function checkPrintBridge(): Promise<boolean> {
  try {
    const res = await fetch(`${PRINT_BRIDGE_URL}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendNetwork(printer: PrinterConfig, data: Uint8Array) {
  if (!printer.ipAddress) throw new Error(`"${printer.name}" has no IP address.`);
  let res: Response;
  try {
    res = await fetch(
      `${PRINT_BRIDGE_URL}/print?host=${encodeURIComponent(printer.ipAddress)}&port=${printer.port || 9100}`,
      { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: data as BodyInit }
    );
  } catch {
    throw new Error("The RST print bridge is not running on this computer. Start it with: npm run print-bridge");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Network printer ${printer.ipAddress} did not respond.`);
  }
}
