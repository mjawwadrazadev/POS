"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ComponentProps,
} from "react";
import { useBlurContainerRef } from "@site/components/animations/BlurScrollRoot";

type PinnedCtx = {
  triggerRef: React.RefObject<HTMLDivElement | null>;
  innerRef: React.RefObject<HTMLDivElement | null>;
};

const PinnedContext = createContext<PinnedCtx | null>(null);

function usePinnedContext() {
  const ctx = useContext(PinnedContext);
  if (!ctx) {
    throw new Error("PinnedSection.Trigger/Inner must be inside PinnedSection");
  }
  return ctx;
}

function PinnedSectionRoot({
  children,
  className,
  blurSection = false,
  ...rest
}: ComponentProps<"div"> & { blurSection?: boolean }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const blurContainerRef = useBlurContainerRef();
  const shouldToggleBlur = blurSection ?? false;

  useLayoutEffect(() => {
    if (!shouldToggleBlur) return;

    const section = sectionRef.current;
    const blurContainer = blurContainerRef.current;
    if (!section || !blurContainer) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top bottom",
        end: "bottom bottom",
        onEnter: () => {
          gsap.set(blurContainer, { display: "block" });
        },
        onLeave: () => {
          gsap.set(blurContainer, { display: "none" });
        },
        onEnterBack: () => {
          gsap.set(blurContainer, { display: "block" });
        },
        onLeaveBack: () => {
          gsap.set(blurContainer, { display: "none" });
        },
      },
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [blurContainerRef, shouldToggleBlur]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const trigger = triggerRef.current;
    const inner = innerRef.current;
    if (!section || !trigger || !inner) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1200px)", () => {
      const st = ScrollTrigger.create({
        trigger: section,
        pin: section,
        start: "bottom bottom",
        end: "+=100%",
        scrub: true,
        pinSpacing: false,
        animation: gsap.to(inner, {
          autoAlpha: 0.3,
          y: "-40vh",
          scale: 0.94,
          ease: "none",
        }),
      });
      return () => {
        st.kill();
      };
    });

    mm.add("(max-width: 1199px)", () => {
      gsap.set(inner, { clearProps: "all" });
    });

    return () => {
      mm.revert();
    };
  }, []);

  const value: PinnedCtx = { triggerRef, innerRef };

  return (
    <PinnedContext.Provider value={value}>
      <div
        ref={sectionRef}
        {...rest}
        className={["pinned-section", className].filter(Boolean).join(" ")}
      >
        {children}
      </div>
    </PinnedContext.Provider>
  );
}

export function PinnedSectionTrigger(props: ComponentProps<"div">) {
  const { triggerRef } = usePinnedContext();
  return (
    <div
      ref={triggerRef}
      {...props}
      className={["pinned-section__trigger", props.className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function PinnedSectionInner(props: ComponentProps<"div">) {
  const { innerRef } = usePinnedContext();
  return (
    <div
      ref={innerRef}
      {...props}
      className={["pinned-section__inner", props.className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

const PinnedSection = Object.assign(PinnedSectionRoot, {
  Trigger: PinnedSectionTrigger,
  Inner: PinnedSectionInner,
});

export default PinnedSection;
