"use client";
import {
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
type UkiyoParallaxProps = {
  children?: ReactNode;
  scale?: number;
  speed?: number;
  externalRAF?: boolean;
} & HTMLAttributes<HTMLDivElement>;

export default function UkiyoParallax({
  children,
  className,
  scale = 1.4,
  speed = 1.5,
  externalRAF = false,
  ...rest
}: UkiyoParallaxProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const target = ref.current;
    if (!target) return;

    let disposed = false;
    let instance: { destroy?: () => void } | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const waitForMediaReady = async () => {
      const media = target.querySelector("video, img") as
        | HTMLVideoElement
        | HTMLImageElement
        | null;
      if (!media) return;

      if (media instanceof HTMLVideoElement) {
        if (media.videoWidth > 0 && media.videoHeight > 0) return;
        await new Promise<void>((resolve) => {
          const done = () => {
            media.removeEventListener("loadedmetadata", done);
            media.removeEventListener("canplay", done);
            resolve();
          };
          media.addEventListener("loadedmetadata", done, { once: true });
          media.addEventListener("canplay", done, { once: true });
        });
        return;
      }

      if (media.complete && media.naturalWidth > 0 && media.naturalHeight > 0) return;
      await new Promise<void>((resolve) => {
        const done = () => {
          media.removeEventListener("load", done);
          resolve();
        };
        media.addEventListener("load", done, { once: true });
      });
    };

    const ensureNonZeroHeight = () => {
      const currentHeight = target.getBoundingClientRect().height;
      if (currentHeight > 0) return;
      const parentHeight = target.parentElement?.getBoundingClientRect().height ?? 0;
      if (parentHeight > 0) {
        target.style.setProperty("height", `${parentHeight}px`, "important");
      }
    };

    const init = async () => {
      await waitForMediaReady();
      // Let transitions/layout settle before ukiyo computes dimensions.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (disposed) return;
      const mod = await import("ukiyojs");
      if (disposed) return;
      const Ukiyo = mod.default;
      instance = new Ukiyo([target], { scale, speed, externalRAF });
      ensureNonZeroHeight();
      requestAnimationFrame(ensureNonZeroHeight);
    };

    const rebuild = () => {
      instance?.destroy?.();
      instance = null;
      void init();
    };

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        ensureNonZeroHeight();
        rebuild();
      }, 120);
    };

    void init();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        ensureNonZeroHeight();
      });
      if (target.parentElement) resizeObserver.observe(target.parentElement);
      resizeObserver.observe(target);
    }

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeObserver?.disconnect();
      instance?.destroy?.();
      instance = null;
    };
  }, [pathname, scale, speed, externalRAF]);

  return (
    <div ref={ref} className={className} {...rest}>
      {children}
    </div>
  );
}
