import Link from "next/link";
import type { ReactNode } from "react";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import { CommonScrollAnimated } from "@site/components/animations/CommonScrollAnimated";
import TextScramble from "@site/components/animations/TextScramble";

type SectionTitleProps = {
  number: string;
  title: ReactNode;
  href?: string;
  cursorText?: string;
  /** Extra class on .mxd-section-title (e.g. "pre-grid", "pre-grid-desktop") */
  variant?: string;
};

/** Numbered section title (template "Section Title v05"). */
export default function SectionTitle({ number, title, href, cursorText, variant = "pre-grid" }: SectionTitleProps) {
  const heading = (
    <CommonAnimatedText as="h2" className="mxd-split-lines" animation="splitLines">
      {title}
    </CommonAnimatedText>
  );

  return (
    <div className="mxd-block">
      <div className={`mxd-section-title ${variant}`}>
        <div className="container-fluid p-0">
          <div className="row g-0">
            <div className="col-12 col-xl-4 mxd-grid-item">
              <div className="mxd-section-title__data top-number">
                <CommonScrollAnimated className="mxd-section-title__number anim-uni-in-up" as="div" animation="inUp">
                  <TextScramble className="title-number mxd-scramble">{number}</TextScramble>
                </CommonScrollAnimated>
              </div>
            </div>
            <div className="col-12 col-xl-8 mxd-grid-item">
              <div className="mxd-section-title__title">
                {href ? (
                  <Link className="active-cursor-accent" data-cursor-text={cursorText} href={href}>
                    {heading}
                  </Link>
                ) : (
                  heading
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
