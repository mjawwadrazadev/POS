"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { usePathname } from "next/navigation";
import { useLenis } from "@site/components/common/LenisContext";

gsap.registerPlugin(ScrollToPlugin);

/** Mirrors legacy `mxdToTop` behavior. */
export default function BackToTop({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const lenis = useLenis();
  const isFirstPathRef = useRef(true);

  useEffect(() => {
    if (isFirstPathRef.current) {
      isFirstPathRef.current = false;
      return;
    }
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
      return;
    }
    gsap.set(window, { scrollTo: 0 });
  }, [pathname, lenis]);

  const onClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    gsap.to(window, {
      scrollTo: 0,
      ease: "hop",
      duration: 2,
    });
  }, []);

  return (
    <a id="to-top" href="#0" className={className} onClick={onClick}>
      {children}
    </a>
  );
}
