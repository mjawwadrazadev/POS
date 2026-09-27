"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type React from "react";

import { useLenis } from "@site/components/common/LenisContext";
import {
  bindMxdMenuGsap,
  type MxdMenuGsapElements,
  type MxdMenuGsapMenuRow,
} from "@site/lib/template/mxdMenuGsap";

const N_HEADER = 3;
const N_MAIN_SPANS = 10;
const N_CONTACT = 8;
const N_FOOTER = 4;
const N_DIVIDERS = 6;
const N_ARROWS = 4;
const N_ROWS = 5;

function compact<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter((x): x is T => x != null);
}

function buildMenuRows(
  lis: (HTMLLIElement | null)[],
  toggles: (HTMLDivElement | null)[],
  subs: (HTMLUListElement | null)[],
): MxdMenuGsapMenuRow[] | null {
  if (
    lis.length !== N_ROWS ||
    toggles.length !== N_ROWS ||
    subs.length !== N_ROWS
  ) {
    return null;
  }
  const rows: MxdMenuGsapMenuRow[] = [];
  for (let i = 0; i < N_ROWS; i++) {
    const item = lis[i];
    const toggle = toggles[i];
    if (!item || !toggle) return null;
    rows.push({ item, toggle, submenu: subs[i] });
  }
  return rows;
}

function collectElements(
  nav: HTMLElement,
  toggle: HTMLElement,
  hamburger: HTMLElement | null,
  refs: UseMxdMenuGsapRefs,
): MxdMenuGsapElements | null {
  const {
    backdrop,
    overlay,
    content,
    mediaWrapper,
    headerSplitTargets,
    mainMenuLinkSpans,
    contactAnchors,
    contactRevealTargets,
    footerSplitTargets,
    dividers,
    arrows,
    menuItemLis,
    menuToggles,
    menuSubmenus,
  } = refs;

  if (
    !backdrop.current ||
    !overlay.current ||
    !content.current ||
    !mediaWrapper.current
  ) {
    return null;
  }

  const headerEls = compact(headerSplitTargets.current);
  const mainSpans = compact(mainMenuLinkSpans.current);
  const contacts = compact(contactAnchors.current);
  const contactRevealEls = compact(contactRevealTargets.current);
  const footers = compact(footerSplitTargets.current);
  const divs = compact(dividers.current);
  const ars = compact(arrows.current);

  if (
    headerEls.length !== N_HEADER ||
    mainSpans.length !== N_MAIN_SPANS ||
    contacts.length !== N_CONTACT ||
    contactRevealEls.length !== N_CONTACT ||
    footers.length !== N_FOOTER ||
    divs.length !== N_DIVIDERS ||
    ars.length !== N_ARROWS
  ) {
    return null;
  }

  const rows = buildMenuRows(
    menuItemLis.current,
    menuToggles.current,
    menuSubmenus.current,
  );
  if (!rows) return null;

  return {
    nav,
    toggle,
    backdrop: backdrop.current,
    overlay: overlay.current,
    content: content.current,
    mediaWrapper: mediaWrapper.current,
    hamburger,
    headerSplitElements: headerEls,
    mainMenuLinkSpans: mainSpans,
    contactAnchors: contacts,
    contactRevealTargets: contactRevealEls,
    footerSplitElements: footers,
    dividers: divs,
    arrows: ars,
    menuRows: rows,
  };
}

export type UseMxdMenuGsapRefs = {
  backdrop: React.RefObject<HTMLDivElement | null>;
  overlay: React.RefObject<HTMLDivElement | null>;
  content: React.RefObject<HTMLDivElement | null>;
  mediaWrapper: React.RefObject<HTMLDivElement | null>;
  headerSplitTargets: React.MutableRefObject<(HTMLElement | null)[]>;
  mainMenuLinkSpans: React.MutableRefObject<(HTMLElement | null)[]>;
  contactAnchors: React.MutableRefObject<(HTMLElement | null)[]>;
  contactRevealTargets: React.MutableRefObject<(HTMLElement | null)[]>;
  footerSplitTargets: React.MutableRefObject<(HTMLElement | null)[]>;
  dividers: React.MutableRefObject<(HTMLElement | null)[]>;
  arrows: React.MutableRefObject<(HTMLElement | null)[]>;
  menuItemLis: React.MutableRefObject<(HTMLLIElement | null)[]>;
  menuToggles: React.MutableRefObject<(HTMLDivElement | null)[]>;
  menuSubmenus: React.MutableRefObject<(HTMLUListElement | null)[]>;
};

export function useMxdMenuGsapRefs(): UseMxdMenuGsapRefs {
  const backdrop = useRef<HTMLDivElement | null>(null);
  const overlay = useRef<HTMLDivElement | null>(null);
  const content = useRef<HTMLDivElement | null>(null);
  const mediaWrapper = useRef<HTMLDivElement | null>(null);
  const headerSplitTargets = useRef<(HTMLElement | null)[]>(
    Array.from({ length: N_HEADER }, () => null),
  );
  const mainMenuLinkSpans = useRef<(HTMLElement | null)[]>(
    Array.from({ length: N_MAIN_SPANS }, () => null),
  );
  const contactAnchors = useRef<(HTMLElement | null)[]>(
    Array.from({ length: N_CONTACT }, () => null),
  );
  const contactRevealTargets = useRef<(HTMLElement | null)[]>(
    Array.from({ length: N_CONTACT }, () => null),
  );
  const footerSplitTargets = useRef<(HTMLElement | null)[]>(
    Array.from({ length: N_FOOTER }, () => null),
  );
  const dividers = useRef<(HTMLElement | null)[]>(
    Array.from({ length: N_DIVIDERS }, () => null),
  );
  const arrows = useRef<(HTMLElement | null)[]>(
    Array.from({ length: N_ARROWS }, () => null),
  );
  const menuItemLis = useRef<(HTMLLIElement | null)[]>(
    Array.from({ length: N_ROWS }, () => null),
  );
  const menuToggles = useRef<(HTMLDivElement | null)[]>(
    Array.from({ length: N_ROWS }, () => null),
  );
  const menuSubmenus = useRef<(HTMLUListElement | null)[]>(
    Array.from({ length: N_ROWS }, () => null),
  );

  return useMemo(
    () => ({
      backdrop,
      overlay,
      content,
      mediaWrapper,
      headerSplitTargets,
      mainMenuLinkSpans,
      contactAnchors,
      contactRevealTargets,
      footerSplitTargets,
      dividers,
      arrows,
      menuItemLis,
      menuToggles,
      menuSubmenus,
    }),
    [
      backdrop,
      overlay,
      content,
      mediaWrapper,
      headerSplitTargets,
      mainMenuLinkSpans,
      contactAnchors,
      contactRevealTargets,
      footerSplitTargets,
      dividers,
      arrows,
      menuItemLis,
      menuToggles,
      menuSubmenus,
    ],
  );
}

/**
 * Binds GSAP menu using explicit refs from `Nav` plus `navNode` / `toggleNode` /
 * `hamburgerNode`. Closes the menu when the route changes.
 */
export function useMxdMenuGsap(
  navNode: HTMLElement | null,
  toggleNode: HTMLElement | null,
  hamburgerNode: HTMLElement | null,
  registerMenuReset: (fn: (() => void) | null) => void,
  refs: UseMxdMenuGsapRefs,
): void {
  const lenis = useLenis();
  const pathname = usePathname();
  const resetMenuRef = useRef<(() => void) | null>(null);
  const closeMenuAnimatedRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    registerMenuReset(null);
    if (!navNode || !toggleNode) return;

    const collected = collectElements(navNode, toggleNode, hamburgerNode, refs);
    if (!collected) return;
    let disposed = false;
    let disposeFn: (() => void) | null = null;

    const bindWhenFontsReady = async () => {
      try {
        if (typeof document !== "undefined" && "fonts" in document) {
          await document.fonts.ready;
        }
      } catch {
        // If the browser does not support the Font Loading API, continue safely.
      }
      if (disposed) return;

      const { dispose, resetMenu, closeMenuAnimated } = bindMxdMenuGsap(
        collected,
        lenis,
      );
      disposeFn = dispose;
      resetMenuRef.current = resetMenu;
      closeMenuAnimatedRef.current = closeMenuAnimated;
      registerMenuReset(resetMenu);
    };
    void bindWhenFontsReady();

    return () => {
      disposed = true;
      disposeFn?.();
      resetMenuRef.current = null;
      closeMenuAnimatedRef.current = null;
      registerMenuReset(null);
      lenis?.start();
    };
  }, [navNode, toggleNode, hamburgerNode, lenis, registerMenuReset, refs]);

  const isFirstPathRef = useRef(true);
  useEffect(() => {
    if (isFirstPathRef.current) {
      isFirstPathRef.current = false;
      return;
    }
    closeMenuAnimatedRef.current?.();
  }, [pathname]);
}
