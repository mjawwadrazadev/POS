import Link from "next/link";
import UkiyoParallax from "@site/components/animations/UkiyoParallax";
import BlurSection from "@site/components/animations/BlurSection";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import { industries } from "@site/content/industries";

/** Large link to the next business type (template "Next project"). */
export default function NextIndustryLink({ currentSlug }: { currentSlug: string }) {
  const idx = industries.findIndex((i) => i.slug === currentSlug);
  const next = industries[(idx + 1) % industries.length];
  const href = `/solutions/${next.slug}`;

  return (
    <BlurSection className="mxd-section padding-top-title">
      <div className="mxd-container fullwidth-container">
        <div className="mxd-block">
          <div className="mxd-next-prj">
            <Link className="mxd-next-prj__data active-cursor-accent" data-cursor-text="Next" href={href}>
              <div className="mxd-next-prj__info">
                <div className="mxd-next-prj__caption">
                  <CommonAnimatedText as="p" className="mxd-split-lines" animation="splitLines">
                    Next industry
                  </CommonAnimatedText>
                </div>
                <div className="mxd-next-prj__name">
                  <CommonAnimatedText as="p" className="mxd-split-lines" animation="splitLines">
                    {`${next.name} — ${next.tagsLeft.slice(0, 2).join(" & ")}`}
                  </CommonAnimatedText>
                </div>
              </div>
              <div className="mxd-next-prj__arrow mxd-flip-arrow">
                <div className="arrow-container-1">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 259 260">
                    <path d="M143.9,0v28.8h-28.8V0H143.9z M143.9,28.8v28.8h28.8V28.8H143.9z M172.7,57.6v28.8h28.8V57.6H172.7z M230.2,115.2V86.4 h-28.8v28.8H0V144h201.4v28.8h28.8V144H259v-28.8H230.2z M172.7,201.6h28.8v-28.8h-28.8V201.6z M143.9,230.4h28.8v-28.8h-28.8V230.4 z M114.3,260h28.8v-28.8h-28.8V260z" />
                  </svg>
                </div>
                <div className="arrow-container-2" />
              </div>
            </Link>
            <Link className="mxd-next-prj__media active-cursor-permanent" data-cursor-text="Next" href={href}>
              <div className="mxd-next-prj__bg">
                <UkiyoParallax className="mxd-next-prj__image parallax-img" scale={1.4} speed={1.5} externalRAF={false} />
                <div className="mxd-next-prj__cover" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </BlurSection>
  );
}
