"use client";

import Link from "next/link";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import { CommonScrollAnimated } from "@site/components/animations/CommonScrollAnimated";
import CommonGravitySection from "@site/components/animations/CommonGravitySection";
import CommonGravityPermanentObjects from "@site/components/animations/CommonGravityPermanentObjects";
import TextScramble from "@site/components/animations/TextScramble";
import { siteConfig } from "@site/content/site";

/** Accent CTA with falling Matter.js objects (template home CTA). */
export default function HomeCTA() {
  return (
    <div className="mxd-section">
      <div className="mxd-container fullwidth-container">
        <div className="mxd-block">
          <CommonGravitySection>
            <div className="mxd-promo mxd-gravity-section accent">
              <div className="mxd-promo__wrap">
                <CommonGravityPermanentObjects />
                <div className="mxd-promo__content">
                  <CommonScrollAnimated className="mxd-promo__btngroup anim-uni-in-up" as="div" animation="inUp">
                    <Link className="btn btn-line btn-line-permanent" href={siteConfig.demoHref}>
                      <TextScramble className="btn-caption mxd-scramble">Book a demo</TextScramble>
                    </Link>
                    <a
                      className="btn btn-line btn-line-permanent"
                      href={siteConfig.loginHref}
                      style={{ marginLeft: "1.6rem" }}
                    >
                      <TextScramble className="btn-caption mxd-scramble">Login</TextScramble>
                    </a>
                  </CommonScrollAnimated>
                  <div className="mxd-promo__caption">
                    <Link className="active-cursor-permanent" data-cursor-text="Contact Us" href={siteConfig.demoHref}>
                      <CommonAnimatedText as="h2" className="mxd-split-lines permanent" animation="splitLines">
                        Let&apos;s set up your store
                      </CommonAnimatedText>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </CommonGravitySection>
        </div>
      </div>
    </div>
  );
}
