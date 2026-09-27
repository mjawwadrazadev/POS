"use client";

import "lenis/dist/lenis.css";

import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useViewportHeight } from "@site/hooks/useViewportHeight";
import { LenisContext } from "@site/components/common/LenisContext";
import BlurScrollRoot from "@site/components/animations/BlurScrollRoot";
import { CursorProvider } from "@site/components/cursor/CursorContext";
import CustomCursor from "@site/components/cursor/CustomCursor";

gsap.registerPlugin(ScrollTrigger, CustomEase);
CustomEase.create("hop", ".87, 0, .13, 1");
CustomEase.create("common", ".23, .65, .74, 1.09");
CustomEase.create("custom", ".23, .65, .74, 1.09");

let pageTransitionRevealCompleted = false;

export default function TemplateRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  useViewportHeight();
  const pathname = usePathname();

  const pageTransitionRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const isFirstPathRef = useRef(true);

  useEffect(() => {
    const transitionEl = pageTransitionRef.current;
    let transitionTween: gsap.core.Tween | null = null;
    if (transitionEl) {
      if (pageTransitionRevealCompleted) {
        gsap.set(transitionEl, { y: "-100%", pointerEvents: "none" });
      } else {
        pageTransitionRevealCompleted = true;
        transitionTween = gsap.to(transitionEl, {
          y: "-100%",
          duration: 0.7,
          ease: "hop",
          onComplete: () => {
            gsap.set(transitionEl, { pointerEvents: "none" });
          },
        });
      }
    }

    const instance = new Lenis();
    lenisRef.current = instance;
    instance.on("scroll", ScrollTrigger.update);

    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        const l = lenisRef.current;
        if (!l) {
          if (arguments.length) {
            window.scrollTo(0, value as number);
          }
          return window.pageYOffset || document.documentElement.scrollTop;
        }
        if (arguments.length) {
          l.scrollTo(value ?? 0, { immediate: true });
        }
        return l.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
      pinType: document.documentElement.style.transform ? "transform" : "fixed",
    });

    const prevScrollTriggerDefaults = (
      ScrollTrigger.defaults as unknown as () => ScrollTrigger.StaticVars
    )();
    ScrollTrigger.defaults({
      ...prevScrollTriggerDefaults,
      scroller: document.documentElement,
    });

    const tickerFn = (time: number) => {
      instance.raf(time * 1000);
    };
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    const lenisStateRafId = requestAnimationFrame(() => {
      setLenis(instance);
    });

    const rafId = requestAnimationFrame(() => {
      ScrollTrigger.refresh(true);
    });

    void document.fonts.ready.then(() => ScrollTrigger.refresh());

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    const onPageShow = (event: PageTransitionEvent) => {
      const navEntry = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      const isBackForward = navEntry?.type === "back_forward";
      if (event.persisted || isBackForward) {
        const el = pageTransitionRef.current;
        if (el) gsap.set(el, { y: "-100%", pointerEvents: "none" });
      }
    };
    window.addEventListener("pageshow", onPageShow);
    const prevScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      transitionTween?.kill();
      cancelAnimationFrame(lenisStateRafId);
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pageshow", onPageShow);
      window.history.scrollRestoration = prevScrollRestoration;
      ScrollTrigger.getAll().forEach((st) => st.kill());
      ScrollTrigger.defaults(prevScrollTriggerDefaults);
      lenisRef.current = null;
      gsap.ticker.remove(tickerFn);
      instance.destroy();
    };
  }, []);

  useLayoutEffect(() => {
    if (isFirstPathRef.current) {
      isFirstPathRef.current = false;
      return;
    }

    const l = lenisRef.current;
    if (l) {
      l.scrollTo(0, { immediate: true, force: true });
    } else {
      window.scrollTo(0, 0);
    }

    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
  }, [pathname]);

  return (
    <LenisContext.Provider value={lenis}>
      <CursorProvider>
        <BlurScrollRoot>
          <div
            ref={pageTransitionRef}
            className="mxd-page-transition"
            aria-hidden
          />
          <CustomCursor />
          {children}
        </BlurScrollRoot>
      </CursorProvider>
    </LenisContext.Provider>
  );
}
