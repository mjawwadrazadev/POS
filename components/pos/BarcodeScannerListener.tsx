"use client";

import { useEffect, useRef } from "react";

interface BarcodeScannerListenerProps {
  onScan: (barcode: string) => void;
  minChars?: number;
  scanTimeoutMs?: number;
  debounceMs?: number;
}

export function BarcodeScannerListener({
  onScan,
  minChars = 3,
  scanTimeoutMs = 80,
  debounceMs = 300,
}: BarcodeScannerListenerProps) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedBarcodeRef = useRef<string>("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keydown if focused element is an input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (bufferRef.current.length >= minChars) {
          const barcode = bufferRef.current.trim();
          const timeSinceLastScan = now - lastScanTimeRef.current;

          // Duplicate-scan debounce protection (e.g. 300ms)
          if (
            barcode === lastScannedBarcodeRef.current &&
            timeSinceLastScan < debounceMs
          ) {
            console.warn(`Debouncing duplicate scanner input for: ${barcode}`);
            bufferRef.current = "";
            return;
          }

          lastScanTimeRef.current = now;
          lastScannedBarcodeRef.current = barcode;
          onScan(barcode);
        }
        bufferRef.current = "";
        return;
      }

      // If key interval is too long, reset buffer (user typed manually)
      if (timeSinceLastKey > scanTimeoutMs && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      // Append printable single characters only (ignore Shift, Ctrl, Alt)
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onScan, minChars, scanTimeoutMs, debounceMs]);

  return null;
}
