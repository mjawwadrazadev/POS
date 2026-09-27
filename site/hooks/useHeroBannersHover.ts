import { gsap } from "gsap";
import { useEffect, type RefObject } from "react";

export type HeroBannerGroupRefs = {
  triggerRef: RefObject<HTMLElement | null>;
  /** All banner tiles for this trigger; null entries are ignored. */
  bannerRefs: readonly RefObject<HTMLElement | null>[];
};

type BannerGroupState = {
  trigger: HTMLElement;
  banners: HTMLElement[];
  tl: gsap.core.Timeline;
  onEnter: () => void;
};

function resolveBanners(
  refs: readonly RefObject<HTMLElement | null>[],
): HTMLElement[] {
  return refs
    .map((r) => r.current)
    .filter((el): el is HTMLElement => el != null);
}

/**
 * Hero headline banner reveals on trigger hover (clipPath + y), reverses when
 * the pointer leaves `hoverContainerRef`. Pass refs only — no DOM queries.
 */
export function useHeroBannersHover(
  hoverContainerRef: RefObject<HTMLElement | null>,
  groups: readonly HeroBannerGroupRefs[],
) {
  useEffect(() => {
    const container = hoverContainerRef.current;
    if (!container) return;

    let activeGroup: BannerGroupState | null = null;
    let isTransitioning = false;

    const resolved: BannerGroupState[] = [];

    for (const g of groups) {
      const trigger = g.triggerRef.current;
      const banners = resolveBanners(g.bannerRefs);
      if (!trigger || banners.length === 0) continue;

      gsap.set(banners, {
        clipPath: "inset(0% 0% 100% 0%)",
        y: 20,
      });

      const tl = gsap
        .timeline({
          paused: true,
          defaults: {
            duration: 0.5,
            ease: "hop",
          },
        })
        .to(banners, {
          clipPath: "inset(0% 0% 0% 0%)",
          y: 0,
        });

      const state: BannerGroupState = {
        trigger,
        banners,
        tl,
        onEnter: () => {
          if (isTransitioning || activeGroup === state) return;

          if (activeGroup) {
            isTransitioning = true;
            activeGroup.tl.eventCallback("onReverseComplete", null);
            activeGroup.tl.eventCallback("onReverseComplete", () => {
              activeGroup = state;
              state.tl.play();
              isTransitioning = false;
            });
            activeGroup.tl.reverse();
          } else {
            activeGroup = state;
            state.tl.play();
          }
        },
      };
      resolved.push(state);
    }

    for (const g of resolved) {
      g.trigger.addEventListener("mouseenter", g.onEnter);
    }

    const onLeave = () => {
      if (!activeGroup || isTransitioning) return;

      isTransitioning = true;
      activeGroup.tl.eventCallback("onReverseComplete", null);
      activeGroup.tl.eventCallback("onReverseComplete", () => {
        activeGroup = null;
        isTransitioning = false;
      });
      activeGroup.tl.reverse();
    };

    container.addEventListener("mouseleave", onLeave);

    return () => {
      container.removeEventListener("mouseleave", onLeave);
      for (const g of resolved) {
        g.trigger.removeEventListener("mouseenter", g.onEnter);
        g.tl.kill();
        gsap.killTweensOf(g.banners);
      }
    };
  }, [hoverContainerRef, groups]);
}
