"use client";

import { useEffect, useRef } from "react";

interface BarcodeScannerListenerProps {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxKeyIntervalMs?: number;
}

export function BarcodeScannerListener({
  onScan,
  minChars = 3,
  maxKeyIntervalMs = 50,
}: BarcodeScannerListenerProps) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keydown if active element is an input or textarea
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
          onScan(barcode);
        }
        bufferRef.current = "";
        return;
      }

      // If key interval is too long, reset buffer (user typed manually)
      if (timeSinceLastKey > maxKeyIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      // Append printable characters only
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onScan, minChars, maxKeyIntervalMs]);

  return null;
}
