"use client";

import { useRef } from "react";
import Link from "next/link";
import BlurSection from "@site/components/animations/BlurSection";
import TextScramble from "@site/components/animations/TextScramble";
import PlaceholderImage from "@site/components/common/Placeholder";
import usePerspectiveListAnimation from "@site/hooks/usePerspectiveListAnimation";
import SectionTitle from "@site/sections/SectionTitle";
import { features } from "@site/content/marketing";

/** Core modules in the template's "Our capabilities" perspective list. */
export default function FeatureList({ number = "C/02" }: { number?: string }) {
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const innerRefs = useRef<Array<HTMLDivElement | null>>([]);

  usePerspectiveListAnimation({ itemRefs, innerRefs, trigger: features });

  return (
    <BlurSection className="mxd-section padding-bottom-default">
      <div className="mxd-container grid-l-container">
        <SectionTitle
          number={number}
          href="/features"
          cursorText="All Features"
          title={
            <>
              Everything
              <br />
              you need to sell
            </>
          }
        />
        <div className="mxd-block">
          <div className="mxd-cpb-list mxd-perspective-list">
            {features.map((item, index) => (
                <div
                  key={item.number}
                  className="mxd-cpb-list__item mxd-perspective-list__item"
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                >
                  <div className="mxd-cpb-list__divider top" />
                  <div
                    className="mxd-cpb-list__inner mxd-perspective-list__inner"
                    ref={(el) => {
                      innerRefs.current[index] = el;
                    }}
                    style={{ position: "relative" }}
                  >
                    <Link
                      href="/features"
                      style={{ position: "absolute", inset: 0, zIndex: 10 }}
                      aria-label={`Learn more about ${item.name}`}
                    />
                    <div className="container-fluid p-0">
                      <div className="row g-0">
                        <div className="col-12 col-xl-4 mxd-grid-item mxd-cpb-list__title">
                          <div className="mxd-cpb-list__number">
                            <span className="meta-tag">{item.number}</span>
                          </div>
                          <p className="mxd-cpb-list__name">{item.name}</p>
                        </div>
                        <div className="col-12 col-md-6 col-xl-4 mxd-grid-item mxd-cpb-list__image">
                          <PlaceholderImage alt={`${item.name} screen`} width={1200} height={980} />
                        </div>
                        <div className="col-12 col-md-6 col-xl-4 mxd-cpb-list__data">
                          <div className="mxd-cpb-list__descr mxd-grid-item">
                            <p className="t-large t-bold">
                              {item.lead} <span>{item.highlight}</span>
                            </p>
                          </div>
                          <div className="mxd-cpb-list__tags">
                            <div className="container-fluid p-0">
                              <div className="row g-0">
                                <div className="col-6 mxd-grid-item mxd-cpb-list__meta">
                                  {item.tagsLeft.map((tag) => (
                                    <TextScramble key={tag} className="meta-tag mxd-scramble">
                                      {tag}
                                    </TextScramble>
                                  ))}
                                </div>
                                <div className="col-6 mxd-grid-item mxd-cpb-list__meta">
                                  {item.tagsRight.map((tag) => (
                                    <TextScramble key={tag} className="meta-tag mxd-scramble">
                                      {tag}
                                    </TextScramble>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mxd-cpb-list__divider bottom" />
                </div>
            ))}
          </div>
        </div>
      </div>
    </BlurSection>
  );
}
