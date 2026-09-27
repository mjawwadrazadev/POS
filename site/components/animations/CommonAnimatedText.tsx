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
import { SplitText } from "gsap/SplitText.js";
import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import SplitType from "split-type";

gsap.registerPlugin(ScrollTrigger, SplitText);

export type CommonTextAnimation =
  | "none"
  | "revealType"
  | "splitLines"
  | "splitLinesReverse"
  | "animChars"
  | "splitLinesLoad"
  | "animCharsLoad";

type CommonAnimatedTextProps<T extends ElementType = "p"> = {
  as?: T;
  className?: string;
  children: ReactNode;
  animation?: CommonTextAnimation;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export default function CommonAnimatedText<T extends ElementType = "p">({
  as,
  className,
  children,
  animation = "none",
  ...rest
}: CommonAnimatedTextProps<T>) {
  const Tag = (as ?? "p") as ElementType;
  const elRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el || animation === "none") return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const init = () => {
      if (cancelled) return;
      if (animation === "revealType") {
        const st = new SplitType(el, {
          types: "words,chars",
          wordClass: "reveal-word",
          charClass: "reveal-char",
        });
        const tween = st.chars?.length
          ? gsap.fromTo(
              st.chars,
              {
                opacity: 0,
                filter: "blur(10px)",
                xPercent: 12,
              },
              {
                scrollTrigger: {
                  trigger: el,
                  start: "top bottom",
                  end: "top 60%",
                  scrub: 1.4,
                },
                opacity: 1,
                filter: "blur(0px)",
                xPercent: 0,
                stagger: 0.03,
                ease: "none",
              },
            )
          : null;
        cleanup = () => {
          tween?.kill();
          st.revert();
        };
        return;
      }

      const split = SplitText.create(el, {
        type:
          animation === "animChars" || animation === "animCharsLoad"
            ? "chars, words"
            : "words, lines",
        ...(animation === "animChars" || animation === "animCharsLoad"
          ? {
              charsClass: "char",
              mask: "chars" as const,
              smartWrap: true,
            }
          : {
              linesClass: "line",
              autoSplit: true,
              mask: "lines" as const,
            }),
        aria: "none",
        onSplit: (self: SplitText) => {
          if (
            animation === "splitLines" ||
            animation === "splitLinesReverse" ||
            animation === "splitLinesLoad"
          ) {
            if (animation === "splitLinesLoad") {
              return gsap.from(self.lines, {
                yPercent: 100,
                rotation: 1,
                duration: 0.6,
                stagger: { amount: 0.2 },
              });
            }

            return gsap
              .timeline({
                scrollTrigger: {
                  trigger: el,
                  start: "top bottom",
                  end: "top 90%",
                  toggleActions: "none play none reset",
                },
              })
              .from(self.lines, {
                yPercent: animation === "splitLines" ? 100 : -100,
                rotation: 1,
                duration: 0.5,
                stagger: { amount: animation === "splitLines" ? 0.2 : 0.1 },
              });
          }

          if (animation === "animCharsLoad") {
            return gsap.from(self.chars, {
              yPercent: 100,
              autoAlpha: 0,
              duration: 0.6,
              ease: "custom",
              stagger: { amount: 0.3 },
            });
          }

          return gsap
            .timeline({
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "top 80%",
                toggleActions: "none play none reset",
              },
            })
            .from(self.chars, {
              yPercent: 100,
              autoAlpha: 0,
              duration: 0.6,
              ease: "custom",
              stagger: { amount: 0.3 },
            });
        },
      });

      cleanup = () => {
        split.revert();
      };
    };

    const boot = () => {
      // Let route transition/layout settle before measuring trigger positions.
      requestAnimationFrame(() => {
        init();
        ScrollTrigger.refresh();
      });
    };

    const delayedRefreshId = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 300);

    if ("fonts" in document) {
      void document.fonts.ready.then(() => {
        boot();
      });
    } else {
      boot();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(delayedRefreshId);
      cleanup?.();
    };
  }, [animation, pathname]);

  return (
    <Tag
      className={className}
      data-common-animated={animation !== "none" ? "1" : undefined}
      {...rest}
      ref={(el: HTMLElement | null) => {
        elRef.current = el;
      }}
    >
      {children}
    </Tag>
  );
}

type CommonAnimatedTextLinkProps = Omit<LinkProps, "as"> &
  Omit<ComponentPropsWithoutRef<"a">, "href"> & {
    children: ReactNode;
    animation?: CommonTextAnimation;
    className?: string;
  };

export function CommonAnimatedTextLink({
  children,
  animation = "none",
  className,
  ...rest
}: CommonAnimatedTextLinkProps) {
  return (
    <CommonAnimatedText
      as={Link}
      className={className}
      animation={animation}
      {...rest}
    >
      {children}
    </CommonAnimatedText>
  );
}
