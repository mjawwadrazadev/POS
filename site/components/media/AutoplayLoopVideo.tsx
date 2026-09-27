"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type Ref,
  type VideoHTMLAttributes,
} from "react";
import { usePathname } from "next/navigation";

export type AutoplayVideoSource = {
  src: string;
  type: string;
};

/** Next.js serves `public/` at `/`; relative `video/...` breaks on nested routes. */
export function toPublicMediaUrl(path: string): string {
  if (!path) return path;
  if (
    path.startsWith("/") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }
  return path.startsWith("video/")
    ? `/${path}`
    : `/${path.replace(/^\.\//, "")}`;
}

export type AutoplayLoopVideoProps = Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  "autoPlay" | "muted" | "loop" | "playsInline" | "children"
> & {
  sources: AutoplayVideoSource[];
  children?: ReactNode;
};

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
  } else {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

/**
 * Background / loop videos: valid boolean props, root-relative URLs, and a guarded
 * `play()` so autoplay works after hydration and when returning to the tab (mobile/desktop).
 */
const AutoplayLoopVideo = forwardRef<HTMLVideoElement, AutoplayLoopVideoProps>(
  function AutoplayLoopVideo(
    { sources, className, poster, preload = "auto", children, ...rest },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLVideoElement>(null);
    const pathname = usePathname();

    const setVideoRef = useCallback(
      (node: HTMLVideoElement | null) => {
        innerRef.current = node;
        assignRef(forwardedRef, node);
      },
      [forwardedRef],
    );

    const posterUrl =
      poster != null ? toPublicMediaUrl(String(poster)) : undefined;
    const normSources = sources.map((s) => ({
      ...s,
      src: toPublicMediaUrl(s.src),
    }));

    useEffect(() => {
      const v = innerRef.current;
      if (!v) return;
      const tryPlay = () => {
        void v.play().catch(() => {});
      };
      tryPlay();
      v.addEventListener("canplay", tryPlay);
      const onVis = () => {
        if (document.visibilityState === "visible") tryPlay();
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        v.removeEventListener("canplay", tryPlay);
        document.removeEventListener("visibilitychange", onVis);
      };
    }, []);

    useEffect(() => {
      const v = innerRef.current;
      if (!v) return;
      // Soft navigations can leave loop videos paused/not initialized.
      v.load();
      void v.play().catch(() => {});
    }, [pathname]);

    return (
      <video
        ref={setVideoRef}
        className={className}
        poster={posterUrl}
        preload={preload}
        autoPlay
        muted
        loop
        playsInline
        {...rest}
      >
        {normSources.map((s) => (
          <source key={`${s.src}-${s.type}`} src={s.src} type={s.type} />
        ))}
        {children}
      </video>
    );
  },
);

export default AutoplayLoopVideo;
