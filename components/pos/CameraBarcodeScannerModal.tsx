"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw, AlertCircle } from "lucide-react";
import { playScanSuccessBeep, playScanErrorBeep } from "@/lib/audio/scanBeep";

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
}: CameraBarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError("");
    setIsScanning(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera video stream is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        detectBarcodeLoop();
      }
    } catch (err: any) {
      setCameraError(err.message || "Failed to access device camera.");
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const detectBarcodeLoop = async () => {
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      // Fallback barcode prompt if BarcodeDetector API is not present
      return;
    }

    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ["code_128", "ean_13", "qr_code", "upc_a"],
      });

      const interval = setInterval(async () => {
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
          clearInterval(interval);
          return;
        }

        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const rawText = barcodes[0].rawValue;
            if (rawText) {
              playScanSuccessBeep();
              onScan(rawText);
              clearInterval(interval);
              stopCamera();
              onClose();
            }
          }
        } catch {
          // Frame analysis error
        }
      }, 300);
    } catch (err) {
      console.warn("BarcodeDetector setup error", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 z-[150] flex items-center justify-center p-4 backdrop-blur-sm font-mono">
      <div className="bg-[#0b0b0d] border border-blue-500/50 w-full max-w-md p-6 text-white space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-blue-400 text-sm uppercase tracking-wider">
            <Camera className="w-4 h-4 text-blue-400" />
            <span>Mobile Camera Barcode Scanner</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xs">
            [Close]
          </button>
        </div>

        {cameraError ? (
          <div className="bg-rose-950/80 border border-rose-500/50 text-rose-300 p-4 text-xs space-y-3 text-center">
            <AlertCircle className="w-6 h-6 mx-auto text-rose-400" />
            <p>{cameraError}</p>
            <p className="text-gray-400 text-[11px]">
              Please ensure camera permissions are allowed or use manual barcode input.
            </p>
          </div>
        ) : (
          <div className="relative bg-black border border-gray-800 overflow-hidden flex items-center justify-center h-64">
            <video
              ref={videoRef}
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-48 h-32 border-2 border-dashed border-emerald-400/80 animate-pulse bg-emerald-500/10" />
                <span className="text-[10px] text-emerald-400 font-bold mt-2 uppercase bg-black/80 px-2 py-0.5 border border-emerald-500/40">
                  Align Barcode inside frame
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-gray-800">
          <span>Supported: EAN-13, Code128, QR</span>
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1.5 uppercase font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
