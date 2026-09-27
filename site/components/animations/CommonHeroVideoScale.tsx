"use client";

import {
  cloneElement,
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/dist/Flip.js";
import { usePathname } from "next/navigation";

gsap.registerPlugin(ScrollTrigger, Flip);

type HeroVideoScaleContextValue = {
  registerWrapper: (index: number) => (el: HTMLElement | null) => void;
  registerTarget: (el: HTMLElement | null) => void;
};

const HeroVideoScaleContext = createContext<HeroVideoScaleContextValue | null>(null);

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(value);
        return;
      }
      (ref as { current: T | null }).current = value;
    });
  };
}

type CommonHeroVideoScaleProps = {
  children: ReactNode;
};

export default function CommonHeroVideoScale({
  children,
}: CommonHeroVideoScaleProps) {
  const wrapperRefs = useRef<HTMLElement[]>([]);
  const targetRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  const registerWrapper = useMemo(
    () => (index: number) => (el: HTMLElement | null) => {
      if (!el) return;
      wrapperRefs.current[index] = el;
    },
    [],
  );

  const registerTarget = (el: HTMLElement | null) => {
    targetRef.current = el;
  };

  useLayoutEffect(() => {
    const wrappers = wrapperRefs.current.filter(Boolean);
    const target = targetRef.current;
    if (wrappers.length < 2 || !target) return;

    let timeline: gsap.core.Timeline | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let settleRaf = 0;
    let resizeObserver: ResizeObserver | null = null;

    const buildTimeline = () => {
      if (timeline) {
        timeline.kill();
        gsap.set(target, { clearProps: "all" });
      }

      timeline = gsap.timeline({
        scrollTrigger: {
          trigger: wrappers[0],
          start: "bottom center-=100",
          endTrigger: wrappers[wrappers.length - 1],
          end: "top center",
          scrub: 0.55,
        },
      });

      wrappers.forEach((el, index) => {
        const next = wrappers[index + 1];
        if (!next) return;

        const thisCenter =
          el.getBoundingClientRect().top + window.pageYOffset + el.offsetHeight / 2;
        const nextCenter =
          next.getBoundingClientRect().top +
          window.pageYOffset +
          next.offsetHeight / 2;
        const offset = Math.max(0.001, nextCenter - thisCenter);

        timeline?.add(
          Flip.fit(target, next, {
            duration: offset,
            ease: "none",
          }) as gsap.core.Tween,
        );
      });

      ScrollTrigger.refresh();
    };

    const handleResize = () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(buildTimeline, 100);
    };

    buildTimeline();
    // Rebuild after route-transition/layout settles to avoid SPA mis-measurement.
    settleRaf = requestAnimationFrame(() => {
      settleTimer = setTimeout(buildTimeline, 220);
    });
    if ("fonts" in document) {
      void document.fonts.ready.then(() => {
        buildTimeline();
      });
    }
    window.addEventListener("resize", handleResize);
    window.addEventListener("load", handleResize);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      wrappers.forEach((el) => resizeObserver?.observe(el));
      resizeObserver.observe(target);
    }

    return () => {
      timeline?.kill();
      gsap.set(target, { clearProps: "all" });
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("load", handleResize);
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      if (settleTimer) {
        clearTimeout(settleTimer);
      }
      if (settleRaf) {
        cancelAnimationFrame(settleRaf);
      }
      resizeObserver?.disconnect();
    };
  }, [pathname]);

  return (
    <HeroVideoScaleContext.Provider
      value={{ registerWrapper, registerTarget }}
    >
      {children}
    </HeroVideoScaleContext.Provider>
  );
}

type CommonHeroVideoScaleWrapperProps = {
  index: number;
  children: ReactElement<{ ref?: Ref<HTMLElement> }>;
};

export function CommonHeroVideoScaleWrapper({
  index,
  children,
}: CommonHeroVideoScaleWrapperProps) {
  const context = useContext(HeroVideoScaleContext);
  if (!context) return children;
  const childRef = children.props.ref;
  const registerRef = context.registerWrapper(index);

  return cloneElement(children, {
    ref: mergeRefs(childRef, registerRef),
  });
}

type CommonHeroVideoScaleTargetProps = {
  children: ReactElement<{ ref?: Ref<HTMLElement> }>;
};

export function CommonHeroVideoScaleTarget({
  children,
}: CommonHeroVideoScaleTargetProps) {
  const context = useContext(HeroVideoScaleContext);
  if (!context) return children;
  const childRef = children.props.ref;

  return cloneElement(children, {
    ref: mergeRefs(childRef, context.registerTarget),
  });
}
