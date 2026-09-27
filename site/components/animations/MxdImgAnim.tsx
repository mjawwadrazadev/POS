"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type MxdImgAnimProps = {
  main: ReactNode;
  absolutes: ReactNode[];
  className?: string;
  children?: ReactNode;
};

const INTERVAL_MS = 350;

/** Preview hover slideshow (mxdHoverSlideshow). */
export default function MxdImgAnim({
  main,
  absolutes,
  className,
  children,
}: MxdImgAnimProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const absRefs = useRef<(HTMLDivElement | null)[]>([]);

  useLayoutEffect(() => {
    absRefs.current = absRefs.current.slice(0, absolutes.length);
  }, [absolutes.length]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const mainEl = mainRef.current;
    const imgs = absRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!root || !mainEl || !imgs.length) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    let current = 0;

    const setOpacity = (el: HTMLElement, v: number) => {
      el.style.opacity = String(v);
    };

    const onEnter = () => {
      setOpacity(mainEl, 0);
      current = 0;
      imgs.forEach((img, i) => setOpacity(img, i === 0 ? 1 : 0));
      interval = setInterval(() => {
        setOpacity(imgs[current]!, 0);
        current = (current + 1) % imgs.length;
        setOpacity(imgs[current]!, 1);
      }, INTERVAL_MS);
    };

    const onLeave = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      imgs.forEach((img) => setOpacity(img, 0));
      setOpacity(mainEl, 1);
    };

    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);

    setOpacity(mainEl, 1);
    imgs.forEach((img) => setOpacity(img, 0));

    return () => {
      if (interval) clearInterval(interval);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [absolutes.length]);

  return (
    <div
      ref={rootRef}
      className={className ? `mxd-img-anim ${className}` : "mxd-img-anim"}
      style={{ width: "100%", height: "100%" }}
    >
      <div ref={mainRef} className="mxd-img-anim__main">
        {main}
      </div>
      {absolutes.map((node, i) => (
        <div
          key={i}
          ref={(el) => {
            absRefs.current[i] = el;
          }}
          className="mxd-img-anim__absolute"
        >
          {node}
        </div>
      ))}
      {children}
    </div>
  );
}
