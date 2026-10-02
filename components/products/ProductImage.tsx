"use client";

import { useState } from "react";

// Soft tile colours for products without a photo, picked from the name so each item keeps its colour
const TILE_COLORS = [
  ["#e8edff", "#002bba"],
  ["#fdecef", "#be123c"],
  ["#e7f8ef", "#047857"],
  ["#fff4e0", "#b45309"],
  ["#f1ebff", "#6d28d9"],
  ["#e3f6fa", "#0e7490"],
  ["#fbeefb", "#a21caf"],
  ["#eef2f6", "#334155"],
];

function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
}

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return TILE_COLORS[Math.abs(hash) % TILE_COLORS.length];
}

interface ProductImageProps {
  name: string;
  src?: string;
  className?: string;
  /** Text size of the initials fallback */
  textClassName?: string;
}

/** Product photo, or a coloured initials tile when the store has not added one. */
export function ProductImage({ name, src, className = "", textClassName = "text-[2.4rem]" }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    );
  }

  const [bg, fg] = colorFor(name);
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center font-extrabold select-none ${textClassName} ${className}`}
      style={{ background: bg, color: fg }}
    >
      {initials(name)}
    </div>
  );
}
