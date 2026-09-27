"use client";

import Link from "next/link";
import PinnedSection from "@site/components/animations/PinnedSection";
import {
  CommonScrollAnimated,
  CommonCardBatchAnimated,
  CommonScrollAnimatedLink,
} from "@site/components/animations/CommonScrollAnimated";
import TextScramble from "@site/components/animations/TextScramble";
import MxdImgAnim from "@site/components/animations/MxdImgAnim";
import PlaceholderImage from "@site/components/common/Placeholder";
import SectionTitle from "@site/sections/SectionTitle";
import { industries } from "@site/content/industries";

// Alternate card shapes like the template's showcase grid
const SHAPES: [number, number][] = [
  [853, 1280],
  [1280, 843],
  [1280, 1280],
  [1280, 853],
  [853, 1280],
  [1280, 1280],
];

type IndustriesGridProps = {
  /** Home page shows the first few with a link to the full list */
  limit?: number;
  number?: string;
  showTitle?: boolean;
};

/** Business types in the template's pinned "projects grid" showcase. */
export default function IndustriesGrid({ limit, number = "S/03", showTitle = true }: IndustriesGridProps) {
  const list = limit ? industries.slice(0, limit) : industries;

  return (
    <PinnedSection blurSection className="mxd-section padding-top-number padding-bottom-default">
      <PinnedSection.Inner>
        <div className="mxd-container grid-l-container">
          {showTitle && (
            <SectionTitle
              number={number}
              href="/solutions"
              cursorText="All Solutions"
              title={
                <>
                  Built for
                  <br />
                  your industry
                </>
              }
            />
          )}
          <div className="mxd-block">
            <div className="mxd-projects-grid">
              <div className="container-fluid p-0">
                <div className="row g-0 mxd-projects-grid__gallery">
                  {list.map((industry, idx) => {
                    const [width, height] = SHAPES[idx % SHAPES.length];
                    const href = `/solutions/${industry.slug}`;
                    return (
                      <CommonCardBatchAnimated
                        key={industry.slug}
                        className="col-12 col-md-6 col-xl-4 mxd-project-item animate-card-3"
                        as="div"
                        columns={3}
                      >
                        <Link className="mxd-project-item__media active-cursor-permanent" data-cursor-text="Explore" href={href}>
                          <MxdImgAnim
                            main={
                              <PlaceholderImage
                                alt={`${industry.name} POS`}
                                width={width}
                                height={height}
                                style={{ width: "100%", height: "100%" }}
                              />
                            }
                            absolutes={[]}
                          />
                        </Link>
                        <div className="mxd-project-item__caption">
                          <div className="mxd-project-item__name">
                            <Link className="project-name-s" href={href}>
                              {industry.name}
                            </Link>
                          </div>
                          <div className="mxd-project-item__tags">
                            {industry.tagsLeft.map((tag) => (
                              <TextScramble key={tag} className="tag tag-s tag-medium mxd-scramble">
                                {tag}
                              </TextScramble>
                            ))}
                          </div>
                        </div>
                      </CommonCardBatchAnimated>
                    );
                  })}
                </div>
                {limit && limit < industries.length && (
                  <div className="row g-0">
                    <div className="mxd-object-link">
                      <div className="container-fluid p-0">
                        <div className="row g-0 mxd-object-link__wrap">
                          <div className="col-12 col-md-6 col-xl-4 mxd-object-link__item justify-start">
                            <CommonScrollAnimated
                              className="mxd-object-link__object mxd-slide-object"
                              as="div"
                              animation="slideObject"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 259 260">
                                <path d="M143.9,0v28.8h-28.8V0h28.8ZM143.9,28.8v28.8h28.8v-28.8h-28.8ZM172.7,57.6v28.8h28.8v-28.8h-28.8ZM230.2,115.2v-28.8h-28.8v28.8H0v28.8h201.4v28.8h28.8v-28.8h28.8v-28.8h-28.8ZM172.7,201.6h28.8v-28.8h-28.8v28.8ZM143.9,230.4h28.8v-28.8h-28.8v28.8ZM114.3,260h28.8v-28.8h-28.8v28.8Z" />
                              </svg>
                            </CommonScrollAnimated>
                          </div>
                          <div className="col-12 col-md-6 col-xl-4 mxd-object-link__item justify-end">
                            <div className="mxd-object-link__content">
                              <CommonScrollAnimated className="mxd-object-link__btnholder anim-uni-in-up" as="div" animation="inUp">
                                <Link className="btn btn-line btn-line-default" href="/solutions">
                                  <TextScramble className="btn-caption mxd-scramble">All solutions</TextScramble>
                                </Link>
                              </CommonScrollAnimated>
                              <CommonScrollAnimatedLink
                                className="mxd-object-link__media active-cursor-permanent anim-uni-in-up"
                                data-cursor-text="All Solutions"
                                href="/solutions"
                                animation="inUp"
                              >
                                <MxdImgAnim
                                  main={<PlaceholderImage className="centered-y" alt="All solutions" width={800} height={450} />}
                                  absolutes={[]}
                                />
                              </CommonScrollAnimatedLink>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <PinnedSection.Trigger />
      </PinnedSection.Inner>
    </PinnedSection>
  );
}
