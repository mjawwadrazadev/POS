"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@site/components/headers/Nav";
import NavTrigger from "@site/components/headers/NavTrigger";

export default function MenuRuntimeShell() {
  const [toggleNode, setToggleNode] = useState<HTMLDivElement | null>(null);
  const [navNode, setNavNode] = useState<HTMLElement | null>(null);
  const [hamburgerNode, setHamburgerNode] = useState<HTMLElement | null>(null);
  const [menuReset, setMenuReset] = useState<(() => void) | null>(null);

  const registerMenuReset = useCallback((fn: (() => void) | null) => {
    setMenuReset(() => fn);
  }, []);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      const navEntry = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming | undefined;
      const isBackForward = navEntry?.type === "back_forward";
      if (event.persisted || isBackForward) {
        menuReset?.();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [menuReset]);

  return (
    <>
      <NavTrigger
        setToggleNode={setToggleNode}
        setHamburgerNode={setHamburgerNode}
      />
      <Nav
        navNode={navNode}
        toggleNode={toggleNode}
        hamburgerNode={hamburgerNode}
        setNavNode={setNavNode}
        registerMenuReset={registerMenuReset}
      />
    </>
  );
}
