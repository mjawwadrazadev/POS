"use client";

import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText.js";
import type Lenis from "lenis";

gsap.registerPlugin(SplitText);

export type MxdMenuGsapMenuRow = {
  item: HTMLLIElement;
  toggle: HTMLDivElement;
  submenu: HTMLUListElement | null;
};

/** All DOM targets for menu GSAP — supplied via React refs (no `querySelector`). */
export type MxdMenuGsapElements = {
  nav: HTMLElement;
  toggle: HTMLElement;
  backdrop: HTMLElement;
  overlay: HTMLElement;
  content: HTMLElement;
  mediaWrapper: HTMLElement | null;
  hamburger: HTMLElement | null;
  headerSplitElements: HTMLElement[];
  mainMenuLinkSpans: HTMLElement[];
  contactAnchors: HTMLElement[];
  contactRevealTargets: HTMLElement[];
  footerSplitElements: HTMLElement[];
  dividers: HTMLElement[];
  arrows: HTMLElement[];
  menuRows: MxdMenuGsapMenuRow[];
};

function splitAndHide(elements: HTMLElement[]): SplitText[] {
  if (!elements.length) return [];
  return elements.map((el) => {
    const split = SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "line",
      aria: "none",
    });
    gsap.set(split.lines, { y: "-114%" });
    return split;
  });
}

function flatLines(splits: SplitText[]): HTMLElement[] {
  return splits.flatMap((s) => s.lines);
}

function resetSubmenus(rows: MxdMenuGsapMenuRow[]): void {
  rows.forEach(({ item, submenu }) => {
    if (!submenu) return;
    gsap.killTweensOf(submenu);
    submenu.style.display = "none";
    gsap.set(submenu, { clearProps: "height,overflow" });
    item.classList.remove("open");
  });
}

function animateSubmenuOpen(sub: HTMLElement, item: HTMLElement): void {
  gsap.killTweensOf(sub);
  item.classList.add("open");
  sub.style.display = "block";
  gsap.set(sub, { height: 0, overflow: "hidden" });
  const targetH = sub.scrollHeight;
  gsap.to(sub, {
    height: targetH,
    duration: 0.4,
    ease: "power2.out",
    onComplete: () => {
      gsap.set(sub, { height: "auto", overflow: "visible" });
    },
  });
}

function animateSubmenuClose(sub: HTMLElement, item: HTMLElement): void {
  gsap.killTweensOf(sub);
  const h = sub.offsetHeight;
  if (h <= 0) {
    sub.style.display = "none";
    item.classList.remove("open");
    gsap.set(sub, { clearProps: "height,overflow" });
    return;
  }
  gsap.set(sub, { height: h, overflow: "hidden" });
  gsap.to(sub, {
    height: 0,
    duration: 0.35,
    ease: "power2.in",
    onComplete: () => {
      sub.style.display = "none";
      item.classList.remove("open");
      gsap.set(sub, { clearProps: "height,overflow" });
    },
  });
}

export function bindMxdMenuGsap(
  el: MxdMenuGsapElements,
  lenis: Lenis | null,
): {
  resetMenu: () => void;
  closeMenuAnimated: () => void;
  dispose: () => void;
} {
  const {
    nav,
    toggle,
    backdrop: menuBackdrop,
    overlay: menuOverlay,
    content: menuOverlayContainer,
    mediaWrapper: menuMediaWrapper,
    hamburger: hamburgerIcon,
    headerSplitElements,
    mainMenuLinkSpans,
    contactAnchors,
    contactRevealTargets,
    footerSplitElements,
    dividers: menuDividers,
    arrows: menuArrows,
    menuRows,
  } = el;

  const headerSplits = splitAndHide(headerSplitElements);
  const mainMenuSplits = splitAndHide(mainMenuLinkSpans);
  const footerSplits = splitAndHide(footerSplitElements);
  // Match legacy SplitText line-mask feel for contact column.
  gsap.set(contactAnchors, { display: "block", overflow: "hidden" });
  gsap.set(contactRevealTargets, { display: "inline-block", y: "-114%" });

  gsap.set(menuDividers, { clipPath: "inset(0% 100% 0% 0%)" });
  gsap.set(menuArrows, { opacity: 0 });
  if (menuMediaWrapper) {
    gsap.set(menuMediaWrapper, { scale: 1.4 });
  }

  gsap.set(menuOverlay, {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
  });
  gsap.set(menuBackdrop, {
    background: "rgba(var(--base-rgb), 0)",
    backdropFilter: "blur(0px)",
  });
  gsap.set(menuOverlayContainer, { yPercent: -50 });

  let isMenuOpen = false;
  let isAnimating = false;
  let activeTimeline: gsap.core.Timeline | null = null;

  const killTimeline = () => {
    activeTimeline?.kill();
    activeTimeline = null;
  };

  const resetMenu = () => {
    killTimeline();
    gsap.set(menuOverlay, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
    });
    gsap.set(menuBackdrop, {
      background: "rgba(var(--base-rgb), 0)",
      backdropFilter: "blur(0px)",
    });
    gsap.set(menuOverlayContainer, { yPercent: -50 });
    if (menuMediaWrapper) {
      gsap.set(menuMediaWrapper, { scale: 1.4 });
    }

    flatLines([
      ...headerSplits,
      ...mainMenuSplits,
      ...footerSplits,
    ]).forEach((line) => gsap.set(line, { y: "-114%" }));
    gsap.set(contactRevealTargets, { display: "inline-block", y: "-114%" });
    gsap.set(menuDividers, { clipPath: "inset(0% 100% 0% 0%)" });
    gsap.set(menuArrows, { opacity: 0 });

    hamburgerIcon?.classList.remove("active");
    resetSubmenus(menuRows);

    isMenuOpen = false;
    isAnimating = false;
    lenis?.start();
  };

  const closeMenuAnimated = () => {
    if (!isMenuOpen || isAnimating) return;
    killTimeline();
    const tl = gsap.timeline({
      onStart: () => {
        isAnimating = true;
      },
      onComplete: () => {
        isAnimating = false;
        activeTimeline = null;
      },
    });
    activeTimeline = tl;

    hamburgerIcon?.classList.remove("active");
    tl.to(menuOverlay, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
      duration: 1,
      ease: "hop",
    })
      .to(
        menuBackdrop,
        {
          background: "rgba(var(--base-rgb), 0)",
          backdropFilter: "blur(0px)",
          duration: 1,
          ease: "power2.in",
        },
        "<",
      )
      .to(
        menuOverlayContainer,
        {
          yPercent: -50,
          duration: 1,
          ease: "hop",
        },
        "<",
      )
      .call(() => {
        flatLines([
          ...headerSplits,
          ...mainMenuSplits,
          ...footerSplits,
        ]).forEach((line) => gsap.set(line, { y: "-114%" }));
        gsap.set(contactRevealTargets, { display: "inline-block", y: "-114%" });
        gsap.set(menuDividers, { clipPath: "inset(0% 100% 0% 0%)" });
        gsap.set(menuArrows, { opacity: 0 });
        if (menuMediaWrapper) {
          gsap.set(menuMediaWrapper, { scale: 1.4 });
        }
        resetSubmenus(menuRows);
        lenis?.start();
      });
    isMenuOpen = false;
  };

  const onToggleClick = (e: Event) => {
    e.preventDefault();
    if (isAnimating) return;

    killTimeline();
    const tl = gsap.timeline({
      onStart: () => {
        isAnimating = true;
      },
      onComplete: () => {
        isAnimating = false;
        activeTimeline = null;
      },
    });
    activeTimeline = tl;

    if (!isMenuOpen) {
      lenis?.stop();
      hamburgerIcon?.classList.add("active");
      const isMobile = window.matchMedia("(max-width: 1024px)").matches;

      tl.to(menuBackdrop, {
        background: isMobile
          ? "rgba(var(--base-rgb), 0.6)"
          : "rgba(var(--base-rgb), 0.8)",
        backdropFilter: isMobile ? "blur(6px)" : "blur(14px)",
        duration: 0.5,
        ease: "power2.out",
      })
        .to(
          menuOverlay,
          {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            duration: 1,
            ease: "hop",
          },
          "<",
        )
        .to(
          menuOverlayContainer,
          {
            yPercent: 0,
            duration: 1,
            ease: "hop",
          },
          "<",
        );

      if (menuMediaWrapper) {
        tl.to(
          menuMediaWrapper,
          {
            scale: 1,
            duration: 0.75,
            ease: "power2.out",
          },
          0.5,
        );
      }

      tl.to(
        footerSplits.flatMap((s) => s.lines),
        { y: "0%", stagger: -0.05, ease: "hop", duration: 0.75 },
        0.15,
      )
        .to(
          mainMenuSplits.flatMap((s) => s.lines),
          { y: "0%", stagger: -0.05, ease: "hop", duration: 0.75 },
          0.15,
        )
        .to(
          menuDividers,
          {
            clipPath: "inset(0% 0% 0% 0%)",
            stagger: -0.05,
            ease: "hop",
            duration: 0.75,
          },
          0.15,
        )
        .to(
          contactRevealTargets,
          { y: "0%", stagger: -0.05, ease: "hop", duration: 0.75 },
          0.15,
        )
        .to(
          headerSplits.flatMap((s) => s.lines),
          { y: "0%", stagger: -0.05, ease: "hop", duration: 0.75 },
          0.45,
        )
        .to(
          menuArrows,
          { opacity: 1, stagger: -0.05, ease: "hop", duration: 0.75 },
          0.45,
        );

      isMenuOpen = true;
    } else {
      closeMenuAnimated();
    }
  };

  const findMenuRowByToggle = (
    t: HTMLDivElement,
  ): MxdMenuGsapMenuRow | undefined => menuRows.find((row) => row.toggle === t);

  const onAccordionClick = (e: MouseEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    for (const row of menuRows) {
      if (
        row.submenu &&
        row.submenu.contains(target) &&
        !row.toggle.contains(target)
      ) {
        return;
      }
    }

    const toggleEl = menuRows
      .map((r) => r.toggle)
      .find((t) => t.contains(target));
    if (!toggleEl) return;

    const row = findMenuRowByToggle(toggleEl);
    if (!row || !row.submenu) return;

    e.preventDefault();
    e.stopPropagation();

    const { item, submenu } = row;
    const wasOpen = item.classList.contains("open");

    menuRows.forEach((other) => {
      if (other === row || !other.submenu) return;
      if (other.item.classList.contains("open")) {
        animateSubmenuClose(other.submenu, other.item);
      }
    });

    if (wasOpen) {
      animateSubmenuClose(submenu, item);
    } else {
      animateSubmenuOpen(submenu, item);
    }
  };

  const onNavLinkClick = (e: MouseEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    const anchor = target?.closest("a[href]");
    if (!anchor || !nav.contains(anchor)) return;
    const href = anchor.getAttribute("href");
    if (!href || href === "#0" || href.startsWith("#")) return;
    closeMenuAnimated();
  };

  toggle.addEventListener("click", onToggleClick);
  nav.addEventListener("click", onAccordionClick, true);
  nav.addEventListener("click", onNavLinkClick);

  const dispose = () => {
    toggle.removeEventListener("click", onToggleClick);
    nav.removeEventListener("click", onAccordionClick, true);
    nav.removeEventListener("click", onNavLinkClick);
    killTimeline();
    resetSubmenus(menuRows);
    [
      ...headerSplits,
      ...mainMenuSplits,
      ...footerSplits,
    ].forEach((s) => s.revert());
    lenis?.start();
  };

  return { resetMenu, closeMenuAnimated, dispose };
}
