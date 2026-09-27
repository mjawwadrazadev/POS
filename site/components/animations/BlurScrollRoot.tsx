"use client";

import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

const BlurContainerRefContext =
  createContext<RefObject<HTMLDivElement | null> | null>(null);

export function useBlurContainerRef(): RefObject<HTMLDivElement | null> {
  const ctx = useContext(BlurContainerRefContext);
  if (!ctx) {
    throw new Error("useBlurContainerRef must be used within BlurScrollRoot");
  }
  return ctx;
}

/** Global blur layers + context for `BlurSection` scroll triggers (mxdBlur). */
export default function BlurScrollRoot({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <BlurContainerRefContext.Provider value={containerRef}>
      <div
        ref={containerRef}
        className="blur-container"
        style={{ display: "none" }}
        aria-hidden
      >
        <div className="blur-layer blur-1" />
        <div className="blur-layer blur-2" />
        <div className="blur-layer blur-3" />
        <div className="blur-layer blur-4" />
        <div className="blur-layer blur-5" />
        <div className="blur-layer blur-6" />
        <div className="blur-layer blur-7" />
        <div className="blur-layer blur-8" />
      </div>
      {children}
    </BlurContainerRefContext.Provider>
  );
}
