"use client";

import BlurSection from "@site/components/animations/BlurSection";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import { CommonScrollAnimated } from "@site/components/animations/CommonScrollAnimated";
import FaqAccordion, { type FaqItem } from "@site/sections/FaqAccordion";

/** Industry-specific questions in a split layout. */
export default function IndustryFaqs({ name, items }: { name: string; items: FaqItem[] }) {
  return (
    <BlurSection className="mxd-section padding-top-default padding-bottom-default">
      <div className="mxd-container grid-l-container">
        <div className="mxd-block">
          <div className="mxd-block-split">
            <div className="container-fluid p-0">
              <div className="row g-0">
                <div className="col-12 col-xl-6 mxd-grid-item mxd-block-split__item manifest-item">
                  <div className="mxd-block-split__inner">
                    <div className="mxd-block-split__subtitle pre-manifest">
                      <CommonScrollAnimated className="anim-uni-in-up" as="p" animation="inUp">
                        <span>/ FAQs</span>
                      </CommonScrollAnimated>
                    </div>
                    <div className="mxd-block-split__manifest">
                      <CommonAnimatedText as="p" className="manifest manifest-s mxd-split-lines" animation="splitLines">
                        {`Common questions from ${name.toLowerCase()} owners`}
                      </CommonAnimatedText>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-xl-6 mxd-grid-item mxd-block-split__item manifest-item">
                  <div className="mxd-block-split__inner">
                    <div className="mxd-block-split__subtitle pre-grid">
                      <CommonScrollAnimated className="anim-uni-in-up" as="p" animation="inUp">
                        <span>/ Answers</span>
                      </CommonScrollAnimated>
                    </div>
                    <FaqAccordion items={items} />
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
