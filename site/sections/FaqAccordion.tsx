"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { CommonScrollAnimated } from "@site/components/animations/CommonScrollAnimated";

export type FaqItem = { question: string; answer: string };

/** Animated accordion (template FAQ page). One item open at a time. */
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const contentRefs = useRef<Array<HTMLDivElement | null>>([]);

  useLayoutEffect(() => {
    const targets = contentRefs.current;
    targets.forEach((content, idx) => {
      if (!content) return;
      gsap.killTweensOf(content);
      const padding = window.matchMedia("(min-width: 768px)").matches ? "5.4rem" : "3rem";

      if (idx === openIndex) {
        gsap.set(content, { display: "flex", height: "auto", paddingTop: 0, paddingBottom: padding });
        gsap.fromTo(
          content,
          { height: 0, paddingTop: 0, paddingBottom: 0 },
          {
            height: content.scrollHeight,
            paddingTop: 0,
            paddingBottom: padding,
            duration: 0.4,
            ease: "power2.out",
            onComplete: () => {
              gsap.set(content, { height: "auto" });
            },
          }
        );
      } else {
        if (getComputedStyle(content).display === "none") return;
        gsap.set(content, { height: content.scrollHeight, paddingTop: 0, paddingBottom: padding });
        gsap.to(content, {
          height: 0,
          paddingTop: 0,
          paddingBottom: 0,
          duration: 0.4,
          ease: "power2.out",
          onComplete: () => {
            gsap.set(content, { display: "none", height: "auto" });
          },
        });
      }
    });
    return () => targets.forEach((content) => content && gsap.killTweensOf(content));
  }, [openIndex]);

  const toggle = (index: number) => setOpenIndex((prev) => (prev === index ? null : index));

  return (
    <div className="mxd-accordion">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={item.question} className="mxd-accordion__item">
            <CommonScrollAnimated className="mxd-accordion__divider anim-uni-in-up" as="div" animation="inUp" />
            <CommonScrollAnimated
              className={`mxd-accordion__title anim-uni-in-up ${isOpen ? "accordion-active accordion-opened" : ""}`}
              as="div"
              animation="inUp"
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onClick={() => toggle(idx)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(idx);
                }
              }}
            >
              <p>{item.question}</p>
              <div className={`mxd-accordion__arrow ${isOpen ? "accordion-rotate" : ""}`}>
                <i className="mxd-accordion__close">
                  <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} version="1.1" viewBox="0 0 18 18">
                    <path d="M3.6,0v3.6H0V0h3.6ZM18,18v-3.6h-3.6v3.6h3.6ZM14.4,7.2v-3.6h-3.6v3.6h-3.6v-3.6h-3.6v3.6h3.6v3.6h3.6v3.6h3.6v-3.6h-3.6v-3.6h3.6ZM18,0h-3.6v3.6h3.6V0ZM0,18h3.6v-3.6H0v3.6ZM3.6,14.4h3.6v-3.6h-3.6v3.6Z" />
                  </svg>
                </i>
                <i className="mxd-accordion__plus">
                  <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} version="1.1" viewBox="0 0 18 18">
                    <path d="M18,7.2v3.6h-7.2v7.2h-3.6v-7.2H0v-3.6h7.2V0h3.6v7.2h7.2Z" />
                  </svg>
                </i>
              </div>
            </CommonScrollAnimated>
            <div
              ref={(el) => {
                contentRefs.current[idx] = el;
              }}
              className="mxd-accordion__content"
            >
              <p className="t-medium mxd-accordion__text">{item.answer}</p>
            </div>
            <CommonScrollAnimated className="mxd-accordion__divider anim-uni-in-up" as="div" animation="inUp" />
          </div>
        );
      })}
    </div>
  );
}
