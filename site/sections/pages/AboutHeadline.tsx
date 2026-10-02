"use client";

import Link from "next/link";
import { useMemo, useRef, type RefObject } from "react";
import BlurSection from "@site/components/animations/BlurSection";
import CommonLoadAnimation, { CommonLoadFade, CommonLoadItem } from "@site/components/animations/CommonLoadAnimation";
import { useHeroBannersHover, type HeroBannerGroupRefs } from "@site/hooks/useHeroBannersHover";
import TextScramble from "@site/components/animations/TextScramble";
import SmoothAnchorLink from "@site/components/common/SmoothAnchorLink";
import PlaceholderImage from "@site/components/common/Placeholder";
import { aboutBanners } from "@site/content/images";
import { socialLinks } from "@site/content/site";

const BANNERS: { cls: string; w: number; h: number }[] = [
  { cls: "landscape image-01", w: 640, h: 480 },
  { cls: "portrait image-02", w: 560, h: 700 },
  { cls: "landscape image-03", w: 640, h: 480 },
  { cls: "portrait image-04", w: 560, h: 700 },
];
const BANNERS_2: { cls: string; w: number; h: number }[] = [
  { cls: "portrait image-05", w: 560, h: 700 },
  { cls: "landscape image-06", w: 640, h: 480 },
  { cls: "portrait image-07", w: 560, h: 700 },
  { cls: "landscape image-08", w: 640, h: 480 },
];

/** About page headline: hovering the highlighted words reveals image banners. */
export default function AboutHeadline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trigger1Ref = useRef<HTMLAnchorElement>(null);
  const trigger2Ref = useRef<HTMLAnchorElement>(null);
  const b1 = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const b2 = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  // Refs are stable, so the groups only need building once
  const groups = useMemo(
    (): readonly HeroBannerGroupRefs[] => [
      { triggerRef: trigger1Ref, bannerRefs: b1 as RefObject<HTMLElement | null>[] },
      { triggerRef: trigger2Ref, bannerRefs: b2 as RefObject<HTMLElement | null>[] },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useHeroBannersHover(containerRef, groups);

  return (
    <CommonLoadAnimation>
      <BlurSection className="mxd-section loading-wrap">
        <div className="mxd-container fullwidth-container">
          <div className="mxd-block">
            <div className="inner-headline fullheight">
              <div className="inner-headline__absolute">
                <div className="mxd-container">
                  <div className="inner-headline__centered">
                    <CommonLoadItem index={0}>
                      <div className="inner-headline__link loading-item">
                        <SmoothAnchorLink className="btn btn-line btn-line-default" targetId="process">
                          <TextScramble className="btn-caption mxd-scramble">About us</TextScramble>
                        </SmoothAnchorLink>
                      </div>
                    </CommonLoadItem>
                    <CommonLoadItem index={1}>
                      <div ref={containerRef} className="inner-headline__title banners-hover centered loading-item">
                        <h1 className="small">
                          Building the point of sale behind{" "}
                          <Link ref={trigger1Ref} className="inner-headline__trigger banners-trigger-1" href="/solutions">
                            busy counters
                          </Link>{" "}
                          and{" "}
                          <Link ref={trigger2Ref} className="inner-headline__trigger banners-trigger-2" href="/features">
                            growing businesses
                          </Link>
                        </h1>
                      </div>
                    </CommonLoadItem>
                    {BANNERS.map((b, i) => (
                      <div key={b.cls} ref={b1[i]} className={`headline-banner-01 ${b.cls}`}>
                        <PlaceholderImage alt="Busy shop counter" width={b.w} height={b.h} src={aboutBanners[0][i]} />
                      </div>
                    ))}
                    {BANNERS_2.map((b, i) => (
                      <div key={b.cls} ref={b2[i]} className={`headline-banner-02 ${b.cls}`}>
                        <PlaceholderImage alt="Growing small business" width={b.w} height={b.h} src={aboutBanners[1][i]} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="inner-headline__dataline">
                <div className="mxd-container">
                  <div className="headline-dataline">
                    <div className="headline-dataline__socials">
                      <ul className="mxd-socials-line centered-mobile">
                        {socialLinks.map((s, i) => (
                          <CommonLoadItem key={s.name} index={i + 2}>
                            <li className="loading-item">
                              <a className="mxd-socials-line__link" href={s.url} target="_blank" rel="noopener noreferrer">
                                <TextScramble className="mxd-scramble">{s.name}</TextScramble>
                              </a>
                            </li>
                          </CommonLoadItem>
                        ))}
                      </ul>
                    </div>
                    <CommonLoadItem index={7}>
                      <div className="headline-dataline__controls loading-item">
                        <SmoothAnchorLink
                          className="btn btn-line-icon btn-line-icon-small btn-line-default slide-down"
                          targetId="process"
                        >
                          <TextScramble className="btn-caption mxd-scramble">Scroll to explore</TextScramble>
                          <i>
                            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 18 18">
                              <path d="M18,10.8h-3.6v-3.6h3.6v3.6ZM7.2,14.4v3.6h3.6v-3.6h3.6v-3.6h-3.6V0h-3.6v10.8h-3.6v3.6s3.6,0,3.6,0ZM3.6,10.8v-3.6H0v3.6h3.6Z" />
                            </svg>
                          </i>
                        </SmoothAnchorLink>
                      </div>
                    </CommonLoadItem>
                  </div>
                </div>
              </div>
              <div className="mxd-container grid-l-container">
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
                            <span className="current-item">About Us</span>
                          </div>
                        </div>
                      </CommonLoadFade>
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
