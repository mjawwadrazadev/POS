"use client";

import Link from "next/link";
import PinnedSection from "@site/components/animations/PinnedSection";
import CommonLoadAnimation, { CommonLoadFade } from "@site/components/animations/CommonLoadAnimation";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import TextScramble from "@site/components/animations/TextScramble";
import SmoothAnchorLink from "@site/components/common/SmoothAnchorLink";

/** Full-height pinned headline over a background image (template "Inner Headline v03"). */
export default function FeaturesHeadline() {
  return (
    <CommonLoadAnimation>
      <PinnedSection className="mxd-section">
        <PinnedSection.Inner>
          <div className="mxd-container fullwidth-container">
            <div className="mxd-block loading-wrap">
              <div className="inner-headline fullheight">
                <div className="inner-headline__bg">
                  {/* TODO: replace with a product video or a photo of the till in use */}
                  <div className="site-bg-placeholder" />
                  <div className="inner-headline__cover" />
                </div>
                <div className="mxd-container grid-l-container">
                  <div className="container-fluid p-0">
                    <div className="row g-0">
                      <div className="col-12 mxd-grid-item">
                        <CommonLoadFade index={0}>
                          <div className="inner-headline__breadcrumbs loading-fade">
                            <div className="breadcrumbs__nav permanent">
                              <span>
                                <Link href="/">
                                  <TextScramble className="mxd-scramble">Home</TextScramble>
                                </Link>
                              </span>
                              <span className="current-item">Features</span>
                            </div>
                          </div>
                        </CommonLoadFade>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="inner-headline__bottom">
                  <div className="mxd-container grid-l-container">
                    <div className="container-fluid p-0">
                      <div className="row g-0">
                        <div className="col-12">
                          <div className="inner-headline__content has-medium-title">
                            <div className="container-fluid p-0">
                              <div className="row g-0">
                                <div className="col-12 col-xl-10 mxd-grid-item">
                                  <CommonLoadFade index={1}>
                                    <div className="inner-headline__link loading-fade">
                                      <SmoothAnchorLink className="btn btn-line btn-line-permanent" targetId="features">
                                        <TextScramble className="btn-caption mxd-scramble">Features</TextScramble>
                                      </SmoothAnchorLink>
                                    </div>
                                  </CommonLoadFade>
                                  <div className="inner-headline__title">
                                    <CommonAnimatedText
                                      as="h1"
                                      className="medium permanent loading-split"
                                      animation="splitLinesLoad"
                                    >
                                      Every tool your counter needs, <span>in one system</span>
                                    </CommonAnimatedText>
                                  </div>
                                </div>
                                <div className="col-12 col-xl-2 mxd-grid-item">
                                  <CommonLoadFade index={2}>
                                    <div className="inner-headline__btngroup align-end-desktop tags-medium-title loading-fade">
                                      <SmoothAnchorLink
                                        className="btn btn-line-icon btn-line-icon-small btn-line-permanent slide-down"
                                        targetId="features"
                                      >
                                        <TextScramble className="btn-caption mxd-scramble">Scroll to explore</TextScramble>
                                        <i>
                                          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 18 18">
                                            <path d="M18,10.8h-3.6v-3.6h3.6v3.6ZM7.2,14.4v3.6h3.6v-3.6h3.6v-3.6h-3.6V0h-3.6v10.8h-3.6v3.6s3.6,0,3.6,0ZM3.6,10.8v-3.6H0v3.6h3.6Z" />
                                          </svg>
                                        </i>
                                      </SmoothAnchorLink>
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
            </div>
          </div>
          <PinnedSection.Trigger />
        </PinnedSection.Inner>
      </PinnedSection>
    </CommonLoadAnimation>
  );
}
