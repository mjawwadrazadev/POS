"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import BlurSection from "@site/components/animations/BlurSection";
import CommonLoadAnimation, { CommonLoadFade, CommonLoadItem } from "@site/components/animations/CommonLoadAnimation";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import TextScramble from "@site/components/animations/TextScramble";

type Crumb = { href: string; label: string };

type PageHeadlineProps = {
  current: string;
  /** Crumbs between Home and the current page */
  parents?: Crumb[];
  title: ReactNode;
  lead: string;
  highlight: string;
  tags?: string[];
  /** "large" suits one or two words; use "medium" for longer titles */
  size?: "large" | "medium";
};

/** Inner page headline with breadcrumbs, a large title, subtitle and tags (template "Inner Headline v01"). */
export default function PageHeadline({ current, parents = [], title, lead, highlight, tags = [], size = "large" }: PageHeadlineProps) {
  return (
    <CommonLoadAnimation>
      <BlurSection className="mxd-section">
        <div className="mxd-container grid-l-container">
          <div className="mxd-block loading-wrap">
            <div className="inner-headline margin-bottom-subtitle">
              <div className="container-fluid p-0">
                <div className="row g-0">
                  <div className="col-12 mxd-grid-item">
                    <CommonLoadFade index={0}>
                      <div className="inner-headline__breadcrumbs loading-fade">
                        <div className="breadcrumbs__nav">
                          {[{ href: "/", label: "Home" }, ...parents].map((crumb) => (
                            <span key={crumb.href}>
                              <Link href={crumb.href}>
                                <TextScramble className="mxd-scramble">{crumb.label}</TextScramble>
                              </Link>
                            </span>
                          ))}
                          <span className="current-item">{current}</span>
                        </div>
                      </div>
                    </CommonLoadFade>
                  </div>
                  <div className="col-12">
                    <div className={`inner-headline__content has-${size}-title`}>
                      <div className="container-fluid p-0">
                        <div className="row g-0">
                          <div className="col-12 col-xl-9 mxd-grid-item">
                            <div className={`inner-headline__title pre-subtitle-${size}`}>
                              <CommonAnimatedText as="h1" className={`${size} loading-split`} animation="splitLinesLoad">
                                {title}
                              </CommonAnimatedText>
                            </div>
                            <CommonLoadItem index={0}>
                              <div className="inner-headline__subtitle loading-item">
                                <p>
                                  {lead} <span>{highlight}</span>
                                </p>
                              </div>
                            </CommonLoadItem>
                          </div>
                          {tags.length > 0 && (
                            <div className="col-12 col-xl-3 mxd-grid-item">
                              <div className={`inner-headline__tags align-end-desktop tags-${size}-subtitle`}>
                                {tags.map((tag, i) => (
                                  <CommonLoadItem key={tag} index={i + 1}>
                                    <TextScramble className="tag tag-m meta-tag mxd-scramble loading-item">{tag}</TextScramble>
                                  </CommonLoadItem>
                                ))}
                              </div>
                            </div>
                          )}
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
