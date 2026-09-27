"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useCursorInteraction } from "@site/components/cursor/CursorContext";
import type { CursorStackEntry } from "@site/components/cursor/cursorTypes";
import {
  mergedCursorHitKey,
  resolveCursorHitFromTarget,
  type MergedCursorHit,
} from "@site/lib/template/cursorHitTest";
import { getDeviceType } from "@site/lib/template/deviceType";

function visualFromTop(top: CursorStackEntry | null) {
  if (!top) {
    return {
      text: "",
      showText: false,
      textExtra: "",
      dotExtra: "",
      rootExtra: "",
      imageSrc: null as string | null,
      showImage: false,
    };
  }
  if (top.type === "opposite") {
    return {
      text: "",
      showText: false,
      textExtra: "",
      dotExtra: "active-opposite",
      rootExtra: "",
      imageSrc: null,
      showImage: false,
    };
  }
  if (top.type === "link") {
    return {
      text: "",
      showText: false,
      textExtra: "",
      dotExtra: "cursor-btn-link",
      rootExtra: "difference",
      imageSrc: null,
      showImage: false,
    };
  }
  if (top.type === "image") {
    return {
      text: "",
      showText: false,
      textExtra: "",
      dotExtra: top.transparent ? "" : "expand",
      rootExtra: "",
      imageSrc: top.src,
      showImage: true,
    };
  }
  const variant = top.variant;
  const textExtra =
    variant === "permanent"
      ? "show permanent"
      : variant === "accent"
        ? "show accent"
        : "show";
  const dotExtra =
    variant === "permanent"
      ? "active-permanent expand"
      : variant === "accent"
        ? "active-accent expand"
        : "active expand";
  return {
    text: top.text,
    showText: true,
    textExtra,
    dotExtra,
    rootExtra: "",
    imageSrc: null,
    showImage: false,
  };
}

const emptyHit: MergedCursorHit = {
  opposite: false,
  link: false,
  text: null,
  image: null,
};

/** Maps DOM hit-test result to the same shape as `visualFromTop` (see `mxdCursor()` combos). */
function visualFromMerged(hit: MergedCursorHit) {
  const dotParts: string[] = [];
  let rootExtra = "";
  let showText = false;
  let text = "";
  let textExtra = "";
  let imageSrc: string | null = null;
  let showImage = false;

  if (hit.opposite) dotParts.push("active-opposite");
  if (hit.link) {
    rootExtra = "difference";
    dotParts.push("cursor-btn-link");
  }
  if (hit.text) {
    showText = true;
    text = hit.text.content;
    if (hit.text.variant === "permanent") {
      textExtra = "show permanent";
      dotParts.push("active-permanent", "expand");
    } else if (hit.text.variant === "accent") {
      textExtra = "show accent";
      dotParts.push("active-accent", "expand");
    } else {
      textExtra = "show";
      dotParts.push("active", "expand");
    }
  }
  if (hit.image) {
    showImage = true;
    imageSrc = hit.image.src;
    if (!hit.image.transparent) dotParts.push("expand");
  }

  return {
    text,
    showText,
    textExtra,
    dotExtra: dotParts.join(" "),
    rootExtra,
    imageSrc,
    showImage,
  };
}

export default function CustomCursor() {
  const [isDesktop] = useState(() => getDeviceType() === "desktop");

  if (!isDesktop) return null;

  return <CustomCursorInner />;
}

function CustomCursorInner() {
  const { stack } = useCursorInteraction();
  const [hitMerged, setHitMerged] = useState<MergedCursorHit>(emptyHit);
  const hitKeyRef = useRef("");
  const lastPointerTargetRef = useRef<EventTarget | null>(null);

  const top = stack.length ? stack[stack.length - 1]! : null;
  const v = top ? visualFromTop(top) : visualFromMerged(hitMerged);

  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const lastRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const root = rootRef.current;
    const imgBox = imageRef.current;
    if (!root || !imgBox) return;

    const onMoveWin = (event: PointerEvent) => {
      const dx = event.clientX - lastRef.current.x;
      gsap.to(root, {
        x: event.clientX,
        y: event.clientY,
        duration: 0.4,
        ease: "power1.out",
        scale: 1,
      });
      gsap.to(imgBox, {
        rotation: gsap.utils.clamp(-6, 6, dx * 0.5),
        duration: 0.3,
        ease: "power1.out",
      });
      lastRef.current = { x: event.clientX, y: event.clientY };
      lastPointerTargetRef.current = event.target;

      if (stack.length > 0) return;
      const hit = resolveCursorHitFromTarget(event.target);
      const key = mergedCursorHitKey(hit);
      if (key !== hitKeyRef.current) {
        hitKeyRef.current = key;
        setHitMerged(hit);
      }
    };

    const onMoveDoc = (event: PointerEvent) => {
      gsap.set(root, { x: event.clientX, y: event.clientY });
    };

    const onDown = (event: MouseEvent) => {
      root.style.transform = `translateX(${event.clientX}px) translateY(${event.clientY}px)`;
    };

    const onLeave = () => {
      gsap.to(root, { duration: 0.4, ease: "power1.in", scale: 0 });
      gsap.to(imgBox, { rotation: 0, duration: 0.3, ease: "power1.in" });
      hitKeyRef.current = "";
      setHitMerged(emptyHit);
    };

    window.addEventListener("pointermove", onMoveWin);
    document.addEventListener("pointermove", onMoveDoc);
    window.addEventListener("mousedown", onDown);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMoveWin);
      document.removeEventListener("pointermove", onMoveDoc);
      window.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [stack.length]);

  useEffect(() => {
    if (stack.length > 0) return;
    const t = lastPointerTargetRef.current;
    if (!t) return;
    const hit = resolveCursorHitFromTarget(t);
    const key = mergedCursorHitKey(hit);
    hitKeyRef.current = key;
    setHitMerged(hit);
  }, [stack.length]);

  const rootClass = ["mxd-cursor", v.rootExtra].filter(Boolean).join(" ");
  const dotClass = ["mxd-cursor__dot", v.dotExtra].filter(Boolean).join(" ");
  const textClass = ["mxd-cursor__text", v.textExtra].filter(Boolean).join(" ");
  const imageClass = ["mxd-cursor__image", v.showImage ? "show" : ""]
    .filter(Boolean)
    .join(" ");

  const rootStyle: CSSProperties = {
    position: "fixed",
    left: 0,
    top: 0,
    pointerEvents: "none",
    zIndex: 9999,
  };

  return (
    <div
      id="mxd-cursor"
      ref={rootRef}
      className={rootClass}
      style={rootStyle}
      aria-hidden
    >
      <div ref={dotRef} className={dotClass} />
      <p ref={textRef} className={textClass}>
        {v.showText ? v.text : "\u00A0"}
      </p>
      <div ref={imageRef} className={imageClass}>
        {v.showImage && v.imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- matches template cursor preview
          <img src={v.imageSrc} alt="" />
        ) : null}
      </div>
    </div>
  );
}
