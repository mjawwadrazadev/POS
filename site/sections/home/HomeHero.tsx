"use client";

import Link from "next/link";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import CommonLoadAnimation, { CommonLoadFade, CommonLoadItem } from "@site/components/animations/CommonLoadAnimation";
import TextScramble from "@site/components/animations/TextScramble";
import SmoothAnchorLink from "@site/components/common/SmoothAnchorLink";
import CommonHeroVideoScale, {
  CommonHeroVideoScaleTarget,
  CommonHeroVideoScaleWrapper,
} from "@site/components/animations/CommonHeroVideoScale";
import PlaceholderImage from "@site/components/common/Placeholder";
import { heroImage } from "@site/content/images";
import { industries } from "@site/content/industries";
import { siteConfig } from "@site/content/site";

const heroIndustries = ["restaurant", "cafe", "bakery", "pharmacy", "retail", "supermarket"];

export default function HomeHero() {
  return (
    <CommonLoadAnimation>
      <CommonHeroVideoScale>
        <div className="mxd-section mxd-hero-section no-padding loading-wrap">
          <div className="mxd-hero-03">
            <div className="mxd-hero-03__headline">
              <Link className="active-cursor-accent" data-cursor-text="Book a demo" href={siteConfig.demoHref}>
                <CommonAnimatedText as="h1" className="permanent loading-split" animation="splitLinesLoad">
                  One point of sale for every kind of business
                </CommonAnimatedText>
              </Link>
              <div className="mxd-hero-media__small">
                <CommonHeroVideoScaleWrapper index={0}>
                  <div className="mxd-hero-media__wrapper">
                    <CommonHeroVideoScaleTarget>
                      <div className="mxd-hero-media__scaling-media">
                        {/* TODO: replace with a product video or screenshot of the POS till */}
                        <PlaceholderImage
                          className="scaling-media__video"
                          width={1280}
                          height={720}
                          alt="Customer paying by card at the counter"
                          src={heroImage}
                        />
                      </div>
                    </CommonHeroVideoScaleTarget>
                  </div>
                </CommonHeroVideoScaleWrapper>
              </div>
            </div>
            {/* control left */}
            <CommonLoadItem index={0}>
              <div className="mxd-hero-03__control-left loading-item">
                <Link className="btn btn-line btn-line-small btn-line-medium" href={siteConfig.demoHref}>
                  <TextScramble className="btn-caption mxd-scramble">Book a demo</TextScramble>
                </Link>
              </div>
            </CommonLoadItem>
            {/* control right — the POS app is a separate root layout, so use a full page load */}
            <CommonLoadItem index={1}>
              <div className="mxd-hero-03__control-right loading-item">
                <a className="btn btn-line btn-line-small btn-line-medium" href={siteConfig.loginHref}>
                  <TextScramble className="btn-caption mxd-scramble">Store login</TextScramble>
                </a>
              </div>
            </CommonLoadItem>
            {/* bottom group */}
            <div className="mxd-hero-03__bottom">
              <CommonLoadFade index={0}>
                <div className="mxd-hero-03__dataline loading-fade">
                  <div className="mxd-hero-03__socials mxd-grid-item">
                    <ul className="mxd-socials-line">
                      {industries
                        .filter((i) => heroIndustries.includes(i.slug))
                        .map((industry) => (
                          <li key={industry.slug}>
                            <Link className="mxd-socials-line__link" href={`/solutions/${industry.slug}`}>
                              <TextScramble className="mxd-scramble">{industry.name.split(" ")[0]}</TextScramble>
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="mxd-hero-03__controls mxd-grid-item">
                    <SmoothAnchorLink className="btn btn-line-icon btn-line-default slide-down" targetId="about">
                      <TextScramble className="btn-caption mxd-scramble">Scroll to explore</TextScramble>
                      <i>
                        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 18 18">
                          <path d="M18,10.8h-3.6v-3.6h3.6v3.6ZM7.2,14.4v3.6h3.6v-3.6h3.6v-3.6h-3.6V0h-3.6v10.8h-3.6v3.6s3.6,0,3.6,0ZM3.6,10.8v-3.6H0v3.6h3.6Z" />
                        </svg>
                      </i>
                    </SmoothAnchorLink>
                  </div>
                </div>
              </CommonLoadFade>
            </div>
          </div>
          {/* media large container */}
          <div className="mxd-hero-media">
            <div className="mxd-hero-media__contain">
              <div className="mxd-hero-media__large">
                <CommonHeroVideoScaleWrapper index={1}>
                  <div className="mxd-hero-media__wrapper" />
                </CommonHeroVideoScaleWrapper>
                <div className="mxd-hero-media__placeholder" />
              </div>
            </div>
          </div>
        </div>
      </CommonHeroVideoScale>
    </CommonLoadAnimation>
  );
}
