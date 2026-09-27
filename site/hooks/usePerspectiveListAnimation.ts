"use client";

import { useLayoutEffect, type MutableRefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type PerspectiveItemRef = MutableRefObject<Array<HTMLDivElement | null>>;

type UsePerspectiveListAnimationParams = {
  itemRefs: PerspectiveItemRef;
  innerRefs: PerspectiveItemRef;
  trigger?: any;
};

/** Shared perspective-list scroll animation for capability/expertise sections. */
export default function usePerspectiveListAnimation({
  itemRefs,
  innerRefs,
  trigger,
}: UsePerspectiveListAnimationParams) {
  useLayoutEffect(() => {
    const cleanups: Array<() => void> = [];

    innerRefs.current.forEach((inner, index) => {
      const item = itemRefs.current[index];
      if (!inner || !item) return;

      gsap.set(inner, {
        rotateX: 0,
        opacity: 1,
        filter: "blur(0px)",
      });

      const tween = gsap.to(inner, {
        rotateX: 30,
        opacity: 0.3,
        filter: "blur(4px)",
        ease: "none",
        scrollTrigger: {
          trigger: item,
          start: "5% top",
          end: "bottom 40%",
          scrub: 0.6,
        },
      });

      cleanups.push(() => {
        tween.scrollTrigger?.kill();
        tween.kill();
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [itemRefs, innerRefs, trigger]);
}
