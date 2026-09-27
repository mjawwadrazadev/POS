"use client";

import { useEffect } from "react";

/** Sets `--vh` on the root element (same as `mxdViewportHeight` in app.js). */
export function useViewportHeight(): void {
  useEffect(() => {
    const root = document.documentElement;
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      root.style.setProperty("--vh", `${vh}px`);
    };
    setVH();
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);
    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
    };
  }, []);
}
