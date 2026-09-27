"use client";

import { useLayoutEffect, useRef } from "react";
import BlurSection from "@site/components/animations/BlurSection";
import { initCtaMarqueeToLeft, initCtaMarqueeToRight } from "@site/lib/template/ctaMarqueeEffects";
import PlaceholderImage from "@site/components/common/Placeholder";

const SIZES: [number, number][] = [
  [1200, 1200],
  [1200, 685],
  [700, 700],
  [737, 1200],
  [800, 1200],
  [1200, 900],
];
const COUNT = 15;

function Track({ reverse }: { reverse?: boolean }) {
  const items = Array.from({ length: COUNT }, (_, i) => SIZES[(reverse ? COUNT - i : i) % SIZES.length]);
  return (
    <>
      {items.map(([w, h], i) => (
        <div key={i} className="marquee__item item-imageblock">
          <div className="marquee__image">
            <PlaceholderImage alt="RST POS gallery" width={w} height={h} />
          </div>
        </div>
      ))}
    </>
  );
}

/** Two image rows scrolling in opposite directions (gallery placeholders for now). */
export default function DoubleMarquee() {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const cleanLeft = initCtaMarqueeToLeft(leftRef.current);
    const cleanRight = initCtaMarqueeToRight(rightRef.current);
    return () => {
      cleanLeft();
      cleanRight();
    };
  }, []);

  return (
    <BlurSection className="mxd-section">
      <div className="mxd-container fullwidth-container">
        <div className="mxd-block">
          <div className="marquee marquee-left--gsap">
            <div className="marquee__toleft marquee__images" ref={leftRef}>
              <Track />
            </div>
          </div>
          <div className="marquee marquee-right--gsap">
            <div className="marquee__toright marquee__images align-start" ref={rightRef}>
              <Track reverse />
            </div>
          </div>
        </div>
      </div>
    </BlurSection>
  );
}
