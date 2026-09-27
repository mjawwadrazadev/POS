"use client";

import Link from "next/link";
import BlurSection from "@site/components/animations/BlurSection";
import CommonLoadAnimation, { CommonLoadFade } from "@site/components/animations/CommonLoadAnimation";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import TextScramble from "@site/components/animations/TextScramble";
import FaqAccordion from "@site/sections/FaqAccordion";
import { generalFaqs } from "@site/content/marketing";

/** FAQ page headline with the accordion beside it (template "Inner Headline v04"). */
export default function FaqHeadline() {
  return (
    <CommonLoadAnimation>
      <BlurSection className="mxd-section padding-bottom-default">
        <div className="mxd-container grid-l-container">
          <div className="mxd-block loading-wrap">
            <div className="inner-headline">
              <div className="container-fluid p-0">
                <div className="row g-0">
                  <div className="col-12 mxd-grid-item">
                    <CommonLoadFade index={0}>
                      <div className="inner-headline__breadcrumbs loading-fade">
                        <div className="breadcrumbs__nav">
                          <span>
                            <Link href="/">
                              <TextScramble className="mxd-scramble">Home</TextScramble>
                            </Link>
                          </span>
                          <span className="current-item">FAQ</span>
                        </div>
                      </div>
                    </CommonLoadFade>
                  </div>
                  <div className="col-12">
                    <div className="inner-headline__content has-medium-title">
                      <div className="container-fluid p-0">
                        <div className="row g-0">
                          <div className="col-12 col-xl-6 mxd-grid-item">
                            <div className="inner-headline__title pre-subtitle-medium">
                              <CommonAnimatedText as="h1" className="medium loading-split" animation="splitLinesLoad">
                                FAQ
                              </CommonAnimatedText>
                            </div>
                            <div className="inner-headline__subtitle">
                              <CommonAnimatedText as="p" className="loading-split" animation="splitLinesLoad">
                                Everything <span>you need to know</span>
                              </CommonAnimatedText>
                            </div>
                          </div>
                          <div className="col-12 col-xl-6 mxd-grid-item">
                            <div className="inner-headline__caption split-caption pre-grid">
                              <CommonAnimatedText as="p" className="t-bold t-large loading-split" animation="splitLinesLoad">
                                Questions about setup, hardware, offline mode or pricing?{" "}
                                <span>
                                  Here are the answers we give most often. Can&apos;t find yours? Our team is one
                                  message away.
                                </span>
                              </CommonAnimatedText>
                            </div>
                            <CommonLoadFade index={1}>
                              <div className="loading-fade">
                                <FaqAccordion items={generalFaqs} />
                              </div>
                            </CommonLoadFade>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BlurSection>
    </CommonLoadAnimation>
  );
}
