// Serial (COM port) barcode scanner saved for this terminal. Keyboard-style scanners need no setup.

const STORAGE_KEY = "rst_pos_serial_scanner";

export interface SerialScannerConfig {
  name: string;
  usbVendorId?: number;
  usbProductId?: number;
  baudRate: number;
}

export function getSerialScanner(): SerialScannerConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSerialScanner(config: SerialScannerConfig | null) {
  try {
    if (config) localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage blocked: the scanner has to be connected again next time
  }
}
