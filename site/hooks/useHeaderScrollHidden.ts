"use client";

import type Lenis from "lenis";
import { useEffect, type RefObject } from "react";

const THRESHOLD = 10;

/** Hides header past scroll offset (Lenis-aware, replaces jQuery scroll on `.mxd-header`). */
export function useHeaderScrollHidden(
  headerRef: RefObject<HTMLElement | null>,
  lenis: Lenis | null,
): void {
  useEffect(() => {
    const el = headerRef.current;
    if (!el || !lenis) return;

    const sync = () => {
      if (lenis.animatedScroll > THRESHOLD) {
        el.classList.add("is-hidden");
      } else {
        el.classList.remove("is-hidden");
      }
    };

    sync();
    const unsub = lenis.on("scroll", sync);
    return () => {
      unsub();
    };
  }, [headerRef, lenis]);
}
