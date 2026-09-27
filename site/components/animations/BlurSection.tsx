"use client";

import { gsap } from "gsap";

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { useBlurContainerRef } from "@site/components/animations/BlurScrollRoot";

type BlurSectionProps = {
  as?: "div" | "footer" | "section";
  id?: string;
  children: ReactNode;
  className?: string;
};

/** Wraps content that should reveal the global blur overlay while in view. */
export default function BlurSection({
  as: Tag = "div",
  id,
  children,
  className,
}: BlurSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const containerRef = useBlurContainerRef();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const container = containerRef.current;
    if (!section || !container) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top bottom",
        end: "bottom bottom",
        onEnter: () => {
          gsap.set(container, { display: "block" });
        },
        onLeave: () => {
          gsap.set(container, { display: "none" });
        },
        onEnterBack: () => {
          gsap.set(container, { display: "block" });
        },
        onLeaveBack: () => {
          gsap.set(container, { display: "none" });
        },
      },
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [containerRef]);

  const cn = className ? `blur-section ${className}` : "blur-section";

  if (Tag === "footer") {
    return (
      <footer ref={sectionRef as RefObject<HTMLElement>} id={id} className={cn}>
        {children}
      </footer>
    );
  }
  if (Tag === "section") {
    return (
      <section
        ref={sectionRef as RefObject<HTMLElement>}
        id={id}
        className={cn}
      >
        {children}
      </section>
    );
  }
  return (
    <div ref={sectionRef as RefObject<HTMLDivElement>} id={id} className={cn}>
      {children}
    </div>
  );
}
