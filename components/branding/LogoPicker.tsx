"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { compressImage } from "@/lib/utils/compressImage";
import { brandInitials, LOGO_UPLOAD_TYPES, MAX_LOGO_FILE_BYTES } from "@/lib/branding/storeBrand";

interface LogoPickerProps {
  /** Current logo (image read from the uploaded file) or "" for none. The server saves it as WebP. */
  value: string;
  onChange: (logo: string) => void;
  /** Store name, for the initials preview shown when there is no logo */
  name: string;
  disabled?: boolean;
}

/** Upload / change / remove a store logo, with a preview of what the sidebar will show. */
export function LogoPicker({ value, onChange, name, disabled }: LogoPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file?: File) {
    if (!file) return;
    setError("");
    if (!(LOGO_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
      setError("Please choose a PNG, JPG or WebP image file");
      return;
    }
    if (file.size > MAX_LOGO_FILE_BYTES) {
      setError("Logo file is too large (max 5 MB)");
      return;
    }
    setBusy(true);
    try {
      // Shrunk here so the upload stays small; the server converts it to a 256px WebP
      onChange(await compressImage(file, 512, 0.92, { keepTransparency: true }));
    } catch (err: any) {
      setError(err.message || "Could not use this image");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Same look as the sidebar brand mark */}
      <div
        className={`w-[6.4rem] h-[6.4rem] flex-shrink-0 flex items-center justify-center border ${
          value ? "bg-white border-stroke-muted p-1" : "bg-[#002bba] border-[#819ffe]/40 text-white"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Store logo" className="w-full h-full object-contain" />
        ) : (
          <span className="font-accent font-extrabold text-[1.6rem]">{brandInitials(name)}</span>
        )}
      </div>

      <div className="space-y-2 min-w-0">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || busy}
            className="btn btn-secondary py-2 px-3 text-[1.1rem] flex items-center gap-1.5 disabled:opacity-50"
          >
            <ImagePlus className="w-4 h-4" />
            <span>{busy ? "Processing…" : value ? "Change Logo" : "Upload Logo"}</span>
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={disabled || busy}
              className="btn btn-secondary py-2 px-3 text-[1.1rem] flex items-center gap-1.5 text-rose-600 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove</span>
            </button>
          )}
        </div>
        <p className="text-[1.15rem] text-muted">
          {value
            ? "Shown at the top of the store's menu."
            : "PNG, JPG or WebP file. Without a logo, the store name's initials are shown."}
        </p>
        {error && <p className="text-[1.15rem] text-rose-600">{error}</p>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={LOGO_UPLOAD_TYPES.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
