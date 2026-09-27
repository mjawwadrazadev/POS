"use client";

import {
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link, { type LinkProps } from "next/link";

gsap.registerPlugin(ScrollTrigger);

export type CommonScrollAnimation =
  | "none"
  | "slideObject"
  | "slideDownObject"
  | "slideRightToLeft"
  | "slideLeftToRight"
  | "clipIn"
  | "inUp"
  | "fadeIn"
  | "slideDownLine"
  | "slideUpLine"
  | "clipImage";

type CommonScrollAnimatedProps<T extends ElementType = "div"> = {
  as?: T;
  animation?: CommonScrollAnimation;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

export function CommonScrollAnimated<T extends ElementType = "div">({
  as,
  children,
  animation = "none",
  ...rest
}: CommonScrollAnimatedProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const elRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el || animation === "none") return;

    const targetForLine =
      animation === "slideDownLine" || animation === "slideUpLine"
        ? (el.firstElementChild as HTMLElement | null)
        : el;
    if (!targetForLine) return;

    if (animation === "clipImage") {
      const imgChild =
        el.firstElementChild instanceof HTMLImageElement
          ? el.firstElementChild
          : null;
      gsap.set(el, { clipPath: "inset(0% 100% 1% 0%)" });
      if (imgChild) gsap.set(imgChild, { scale: 1.2 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "top 50%",
          scrub: true,
        },
      });

      timeline.to(el, { clipPath: "inset(0% 0% 0% 0%)" }, "<");
      if (imgChild) timeline.to(imgChild, { scale: 1 }, "<");

      return () => {
        timeline.scrollTrigger?.kill();
        timeline.kill();
      };
    }

    const tweenByAnimation: Record<
      Exclude<CommonScrollAnimation, "none" | "clipImage">,
      () => gsap.core.Tween
    > = {
      slideObject: () =>
        gsap.fromTo(
          el,
          { xPercent: 0, ease: "custom" },
          {
            xPercent: 120,
            scrollTrigger: {
              trigger: el,
              start: "top 70%",
              end: "bottom top",
              scrub: true,
              toggleActions: "play none none reverse",
            },
          },
        ),
      slideDownObject: () =>
        gsap.fromTo(
          el,
          { yPercent: 0, ease: "custom" },
          {
            yPercent: 160,
            scrollTrigger: {
              trigger: el,
              start: "top 40%",
              end: "bottom top",
              scrub: true,
              toggleActions: "play none none reverse",
            },
          },
        ),
      slideRightToLeft: () =>
        gsap.fromTo(
          el,
          { xPercent: 10, autoAlpha: 0, ease: "custom" },
          {
            xPercent: 0,
            autoAlpha: 1,
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom 20%",
              scrub: true,
              toggleActions: "play none none reverse",
            },
          },
        ),
      slideLeftToRight: () =>
        gsap.fromTo(
          el,
          { xPercent: -10, autoAlpha: 0, ease: "custom" },
          {
            xPercent: 0,
            autoAlpha: 1,
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom 20%",
              scrub: true,
              toggleActions: "play none none reverse",
            },
          },
        ),
      slideDownLine: () =>
        gsap.fromTo(
          targetForLine,
          { yPercent: -100, ease: "none" },
          {
            yPercent: 0,
            scrollTrigger: {
              trigger: el,
              start: "top 90%",
              end: "bottom 70%",
              toggleActions: "play none none reverse",
            },
          },
        ),
      slideUpLine: () =>
        gsap.fromTo(
          targetForLine,
          { yPercent: 100, ease: "none" },
          {
            yPercent: 0,
            scrollTrigger: {
              trigger: el,
              start: "top 90%",
              end: "top 70%",
              scrub: 1,
              toggleActions: "play none none reverse",
            },
          },
        ),
      inUp: () =>
        gsap.fromTo(
          el,
          { opacity: 0, y: 50, ease: "sine" },
          {
            y: 0,
            opacity: 1,
            scrollTrigger: {
              trigger: el,
              toggleActions: "play none none reverse",
            },
          },
        ),
      fadeIn: () =>
        gsap.fromTo(
          el,
          { opacity: 0, duration: 2, ease: "none" },
          {
            opacity: 1,
            duration: 2,
            scrollTrigger: {
              trigger: el,
              toggleActions: "play none none reverse",
            },
          },
        ),
      clipIn: () =>
        gsap.fromTo(
          el,
          { clipPath: "inset(0% 100% 0% 0%)", ease: "custom" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            scrollTrigger: {
              trigger: el,
              start: "top 90%",
              end: "bottom 70%",
              toggleActions: "play none none reverse",
            },
          },
        ),
    };

    const tween = tweenByAnimation[animation]();
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [animation]);

  return (
    <Tag ref={elRef} {...rest}>
      {children}
    </Tag>
  );
}

type CommonScrollAnimatedLinkProps = Omit<LinkProps, "as"> &
  Omit<ComponentPropsWithoutRef<"a">, "href"> & {
    animation?: CommonScrollAnimation;
    children?: ReactNode;
  };

export function CommonScrollAnimatedLink({
  animation = "none",
  children,
  ...rest
}: CommonScrollAnimatedLinkProps) {
  return (
    <CommonScrollAnimated as={Link} animation={animation} {...rest}>
      {children}
    </CommonScrollAnimated>
  );
}

type CommonCardBatchAnimatedProps<T extends ElementType = "div"> = {
  as?: T;
  children?: ReactNode;
  columns: 2 | 3 | 4;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

type BatchRuntime = {
  refsCount: number;
  triggers: ScrollTrigger[];
};

const cardBatchRuntimeByColumns = new Map<2 | 3 | 4, BatchRuntime>();
const pendingBatchRafByColumns = new Map<2 | 3 | 4, number>();

function setupCardBatch(columns: 2 | 3 | 4): BatchRuntime {
  const selector = `.animate-card-${columns}`;
  const cards = gsap.utils.toArray<HTMLElement>(selector);
  if (!cards.length) {
    return {
      refsCount: 0,
      triggers: [],
    };
  }

  gsap.set(selector, { y: 50, opacity: 0 });
  const triggers = ScrollTrigger.batch(selector, {
    interval: 0.1,
    batchMax: columns,
    ...(columns !== 4 ? { duration: 3 } : {}),
    ...(columns === 4 ? { delay: 1000 } : {}),
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        ease: "sine",
        stagger: { each: 0.15, grid: [1, columns] },
        overwrite: true,
      });
    },
    onLeave: (batch) => {
      gsap.set(batch, { opacity: 1, y: 0, overwrite: true });
    },
    onEnterBack: (batch) => {
      gsap.to(batch, { opacity: 1, y: 0, stagger: 0.15, overwrite: true });
    },
    onLeaveBack: (batch) => {
      gsap.set(batch, { opacity: 0, y: 50, overwrite: true });
    },
  }) as ScrollTrigger[];

  return {
    refsCount: 0,
    triggers,
  };
}

function teardownCardBatch(runtime: BatchRuntime): void {
  runtime.triggers.forEach((trigger) => trigger.kill());
}

function rebuildCardBatch(columns: 2 | 3 | 4): BatchRuntime {
  const prev = cardBatchRuntimeByColumns.get(columns);
  if (prev) {
    teardownCardBatch(prev);
  }
  const next = setupCardBatch(columns);
  next.refsCount = prev?.refsCount ?? 0;
  cardBatchRuntimeByColumns.set(columns, next);
  return next;
}

function scheduleBatchRebuild(columns: 2 | 3 | 4): void {
  const pending = pendingBatchRafByColumns.get(columns);
  if (pending) {
    cancelAnimationFrame(pending);
  }

  const rafId = requestAnimationFrame(() => {
    pendingBatchRafByColumns.delete(columns);
    const runtime = cardBatchRuntimeByColumns.get(columns);
    if (!runtime || runtime.refsCount <= 0) {
      if (runtime) {
        teardownCardBatch(runtime);
        cardBatchRuntimeByColumns.delete(columns);
      }
      return;
    }
    rebuildCardBatch(columns);
  });

  pendingBatchRafByColumns.set(columns, rafId);
}

export function CommonCardBatchAnimated<T extends ElementType = "div">({
  as,
  children,
  columns,
  ...rest
}: CommonCardBatchAnimatedProps<T>) {
  const Tag = (as ?? "div") as ElementType;

  useLayoutEffect(() => {
    let runtime = cardBatchRuntimeByColumns.get(columns);
    if (!runtime) {
      runtime = setupCardBatch(columns);
      cardBatchRuntimeByColumns.set(columns, runtime);
    }
    runtime.refsCount += 1;
    scheduleBatchRebuild(columns);

    return () => {
      const current = cardBatchRuntimeByColumns.get(columns);
      if (!current) return;
      current.refsCount -= 1;
      scheduleBatchRebuild(columns);
    };
  }, [columns]);

  return <Tag {...rest}>{children}</Tag>;
}
