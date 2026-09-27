"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import BlurSection from "@site/components/animations/BlurSection";
import { initCtaMarqueeToLeft } from "@site/lib/template/ctaMarqueeEffects";
import { CommonScrollAnimated } from "@site/components/animations/CommonScrollAnimated";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import TextScramble from "@site/components/animations/TextScramble";
import PlaceholderImage from "@site/components/common/Placeholder";
import { marqueeTags } from "@site/content/marketing";

// Alternate the placeholder shapes so the marquee keeps the template's rhythm
const SIZES = [
  [1200, 1200],
  [1200, 685],
  [800, 1200],
  [1200, 900],
  [737, 1200],
];

type PageCTAProps = {
  heading?: string;
  buttonText?: string;
  href?: string;
};

/** Closing call-to-action with an industries image marquee (template "CTA with marquee"). */
export default function PageCTA({
  heading = "Ready to make checkout effortless?",
  buttonText = "Book a free demo",
  href = "/contact",
}: PageCTAProps) {
  const marqueeTrackRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => initCtaMarqueeToLeft(marqueeTrackRef.current), []);

  // Repeat the first items at the end so the loop has no visible seam
  const items = [...marqueeTags, ...marqueeTags.slice(0, 5)];

  return (
    <BlurSection className="mxd-section bg-color-opposite">
      <div className="mxd-container fullwidth-container">
        <div className="mxd-block">
          <div className="mxd-promo transparent">
            <div className="mxd-promo__wrap auto-height">
              <div className="mxd-promo__content">
                <CommonScrollAnimated className="mxd-promo__btngroup anim-uni-in-up" as="div" animation="inUp">
                  <Link className="btn btn-line btn-line-opposite" href={href}>
                    <TextScramble className="btn-caption mxd-scramble">{buttonText}</TextScramble>
                  </Link>
                </CommonScrollAnimated>
                <div className="mxd-promo__caption">
                  <Link className="active-cursor-accent" data-cursor-text="Contact Us" href={href}>
                    <CommonAnimatedText as="h2" className="reveal-type opposite" animation="revealType">
                      {heading}
                    </CommonAnimatedText>
                  </Link>
                </div>
              </div>
              <div className="mxd-promo__marquee">
                <div className="marquee marquee-left--gsap">
                  <div className="marquee__toleft marquee__images" ref={marqueeTrackRef}>
                    {items.map((tag, i) => {
                      const [w, h] = SIZES[i % SIZES.length];
                      return (
                        <div key={`${tag}-${i}`} className="marquee__item item-imageblock">
                          <div className="marquee__tags">
                            <TextScramble className="tag tag-s tag-medium-opposite mxd-scramble">{tag}</TextScramble>
                          </div>
                          <div className="marquee__image">
                            <PlaceholderImage width={w} height={h} alt={`${tag} point of sale`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BlurSection>
  );
}
