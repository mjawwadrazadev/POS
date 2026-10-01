"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, AlertCircle } from "lucide-react";
import { playScanSuccessBeep } from "@/lib/audio/scanBeep";

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
  const [engine, setEngine] = useState<"native" | "zxing" | "">("");
  const [manualCodeInput, setManualCodeInput] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    doneRef.current = false;
    startCamera();

    return () => {
      stopCamera();
    };
    // Start/stop only when the modal opens or closes; the camera helpers are recreated every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleDetected = (rawText: string) => {
    if (doneRef.current || !rawText) return;
    doneRef.current = true;
    playScanSuccessBeep();
    onScan(rawText);
    stopCamera();
    onClose();
  };

  const startCamera = async () => {
    setCameraError("");
    setIsScanning(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access needs a secure (https) page and a browser with camera support.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        await detectBarcodeLoop();
      }
    } catch (err: any) {
      setCameraError(err?.name === "NotAllowedError" ? "Camera permission was denied." : err?.message || "Failed to access device camera.");
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // All 1D retail/warehouse codes plus QR and Data Matrix
  const WANTED_FORMATS = [
    "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "code_93", "itf", "codabar", "qr_code", "data_matrix",
  ];

  const detectBarcodeLoop = async () => {
    const video = videoRef.current;
    if (!video) return;

    // 1. Native detector (Chrome/Edge on Android, ChromeOS, macOS)
    const Native = (window as any).BarcodeDetector;
    if (Native) {
      try {
        const supported: string[] = (await Native.getSupportedFormats?.()) ?? WANTED_FORMATS;
        const formats = WANTED_FORMATS.filter((f) => supported.includes(f));
        if (formats.length > 0) {
          const detector = new Native({ formats });
          setEngine("native");
          intervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0) handleDetected(codes[0].rawValue);
            } catch {
              // frame not ready
            }
          }, 250);
          return;
        }
      } catch {
        // fall through to ZXing
      }
    }

    // 2. ZXing in JavaScript: works in every browser (Windows Chrome, Firefox, Safari/iPhone)
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader();
    setEngine("zxing");
    zxingControlsRef.current = await reader.decodeFromVideoElement(video, (result) => {
      if (result) handleDetected(result.getText());
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCodeInput.trim()) {
      doneRef.current = true;
      playScanSuccessBeep();
      onScan(manualCodeInput.trim());
      setManualCodeInput("");
      stopCamera();
      onClose();
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
          </div>
        ) : (
          <div className="relative bg-black border border-gray-800 overflow-hidden flex items-center justify-center h-60">
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

        {/* Manual Barcode Input Fallback (for Safari / Non-BarcodeDetector devices) */}
        <form onSubmit={handleManualSubmit} className="space-y-2 text-xs">
          <label className="block text-gray-400 uppercase tracking-wider text-[11px]">
            Direct Barcode Input / Keypad Fallback
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCodeInput}
              onChange={(e) => setManualCodeInput(e.target.value)}
              placeholder="e.g. 890123456789"
              className="flex-1 bg-gray-900 border border-gray-700 text-white px-3 py-2 outline-none focus:border-blue-500 font-bold"
            />
            <button
              type="submit"
              className="bg-[#002bba] hover:bg-blue-700 text-white px-4 py-2 uppercase font-bold text-xs"
            >
              Add Item
            </button>
          </div>
        </form>

        <div className="flex justify-between items-center text-[11px] text-gray-400 pt-2 border-t border-gray-800">
          <span>{engine === "zxing" ? "Scanner: ZXing (all browsers)" : engine === "native" ? "Scanner: built-in detector" : "Starting camera..."}</span>
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 uppercase font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
