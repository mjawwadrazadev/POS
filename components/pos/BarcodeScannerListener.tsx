"use client";

import { useEffect, useRef } from "react";

interface BarcodeScannerListenerProps {
  onScan: (barcode: string) => void;
  minChars?: number;
  /** Max gap between keystrokes of one scan; slower input is treated as a person typing */
  scanTimeoutMs?: number;
  debounceMs?: number;
}

/**
 * Handles every scanner that "types" the code: USB, 2.4 GHz wireless and Bluetooth (HID) scanners.
 * Works whether the scanner ends a scan with Enter, Tab or nothing at all.
 */
export function BarcodeScannerListener({
  onScan,
  minChars = 3,
  scanTimeoutMs = 80,
  debounceMs = 300,
}: BarcodeScannerListenerProps) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const lastScanRef = useRef({ code: "", at: 0 });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    const emit = () => {
      const code = bufferRef.current.trim();
      bufferRef.current = "";
      if (code.length < minChars) return false;
      const now = Date.now();
      // Some scanners send the same code twice in a row
      if (code === lastScanRef.current.code && now - lastScanRef.current.at < debounceMs) return true;
      lastScanRef.current = { code, at: now };
      onScanRef.current(code);
      return true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Typing into a field is left alone; the scan lands in that field like normal text
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) {
        return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();
      const gap = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      if (e.key === "Enter" || e.key === "Tab") {
        if (bufferRef.current.length >= minChars) {
          // Stop the scanner's Enter from also "clicking" a focused button (e.g. Pay)
          e.preventDefault();
          emit();
        } else {
          bufferRef.current = "";
        }
        return;
      }

      if (gap > scanTimeoutMs && bufferRef.current.length > 0) bufferRef.current = "";
      if (e.key.length === 1) bufferRef.current += e.key;

      // Scanners set up without a suffix: a burst of fast keys followed by silence is a scan
      idleTimerRef.current = setTimeout(() => {
        if (bufferRef.current.length >= Math.max(minChars, 4)) emit();
        else bufferRef.current = "";
      }, scanTimeoutMs + 40);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [minChars, scanTimeoutMs, debounceMs]);

  return null;
}
