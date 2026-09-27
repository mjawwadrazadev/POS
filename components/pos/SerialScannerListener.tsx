"use client";

import { useEffect, useRef } from "react";
import { findSerialPort } from "@/lib/printer/transports";
import { getSerialScanner } from "@/lib/scanner/scannerConfig";

/**
 * Reads scans from a serial (COM port / RS-232 / USB-CDC) barcode scanner saved in Printer & Scanner
 * settings. Needs Chrome or Edge; renders nothing and does nothing when no serial scanner is set up.
 */
export function SerialScannerListener({ onScan }: { onScan: (barcode: string) => void }) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    const config = getSerialScanner();
    if (!config || typeof navigator === "undefined" || !("serial" in navigator)) return;

    let cancelled = false;
    let port: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    (async () => {
      try {
        port = await findSerialPort(config);
        if (!port || cancelled) return;
        await port.open({ baudRate: config.baudRate || 9600 });
        reader = port.readable.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled && reader) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // Scanners end each code with CR and/or LF
          const parts = buffer.split(/[\r\n]+/);
          buffer = parts.pop() ?? "";
          for (const code of parts.map((p) => p.trim()).filter(Boolean)) onScanRef.current(code);
        }
      } catch (err) {
        if (!cancelled) console.warn("Serial scanner stopped:", err);
      }
    })();

    return () => {
      cancelled = true;
      (async () => {
        try {
          await reader?.cancel();
          reader?.releaseLock();
          await port?.close();
        } catch {
          // port already closed
        }
      })();
    };
  }, []);

  return null;
}
