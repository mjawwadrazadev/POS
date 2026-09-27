"use client";

import Link from "next/link";
import BlurSection from "@site/components/animations/BlurSection";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import CommonLoadAnimation, { CommonLoadFade } from "@site/components/animations/CommonLoadAnimation";
import TextScramble from "@site/components/animations/TextScramble";
import ContactForm from "@site/sections/pages/ContactForm";
import { mailtoHref, siteConfig } from "@site/content/site";

/** Contact page headline with the enquiry form and a full-width email link. */
export default function ContactHeadline() {
  return (
    <CommonLoadAnimation>
      <BlurSection className="mxd-section">
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
                          <span className="current-item">Contact</span>
                        </div>
                      </div>
                    </CommonLoadFade>
                  </div>
                  <div className="col-12">
                    <div className="inner-headline__content has-medium-title">
                      <div className="container-fluid p-0">
                        <div className="row g-0">
                          <div className="col-12 col-xl-6 mxd-grid-item">
                            <div className="inner-headline__title">
                              <CommonAnimatedText as="h1" className="medium loading-split" animation="splitLinesLoad">
                                Let&apos;s set up your store
                              </CommonAnimatedText>
                            </div>
                          </div>
                          <div className="col-12 col-xl-6">
                            <div className="inner-headline__caption split-caption-title pre-form">
                              <div className="mxd-grid-item">
                                <CommonAnimatedText as="p" className="t-bold t-large loading-split" animation="splitLinesLoad">
                                  Want a demo or a price for your business? Tell us a little about it{" "}
                                  <span>
                                    and our team will call you back to walk you through {siteConfig.name} on your own
                                    products.
                                  </span>
                                </CommonAnimatedText>
                              </div>
                            </div>
                            <ContactForm />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mxd-block">
            <div className="fullwidth-text headline-email-text bottom-text-small mxd-grid-item">
              <div className="fullwidth-text__wrap">
                <a
                  className="fullwidth-text__content small accent active-cursor"
                  data-cursor-text="Let's chat"
                  href={mailtoHref}
                  aria-label={`Send email to ${siteConfig.email}`}
                >
                  <CommonAnimatedText as="span" className="anim-uni-chars" animation="animChars">
                    {siteConfig.email}
                  </CommonAnimatedText>
                </a>
              </div>
            </div>
          </div>
        </div>
      </BlurSection>
    </CommonLoadAnimation>
  );
}
