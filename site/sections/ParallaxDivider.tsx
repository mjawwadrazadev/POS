import Link from "next/link";
import UkiyoParallax from "@site/components/animations/UkiyoParallax";
import BlurSection from "@site/components/animations/BlurSection";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import { CommonScrollAnimated } from "@site/components/animations/CommonScrollAnimated";
import TextScramble from "@site/components/animations/TextScramble";

type ParallaxDividerProps = {
  /** Background photo (see site/content/images.ts) */
  image: string;
  /** Optional overlay headline with a button */
  caption?: string;
  href?: string;
  buttonText?: string;
  cursorText?: string;
};

/** Full-width parallax image divider. */
export default function ParallaxDivider({ image, caption, href, buttonText, cursorText }: ParallaxDividerProps) {
  return (
    <BlurSection className="mxd-section">
      <div className="mxd-container fullwidth-container">
        <div className="mxd-divider">
          <UkiyoParallax
            className="mxd-divider__image parallax-img"
            style={{ backgroundImage: `url(${image})` }}
            scale={1.4}
            speed={1.5}
            externalRAF={false}
          />
          {caption && href && (
            <>
              <div className="mxd-divider__cover cover-04" />
              <div className="mxd-divider__content">
                {buttonText && (
                  <CommonScrollAnimated className="mxd-divider__btngroup anim-uni-slide-up" as="div" animation="slideUpLine">
                    <Link className="btn btn-line btn-line-permanent" href={href}>
                      <TextScramble className="btn-caption mxd-scramble">{buttonText}</TextScramble>
                    </Link>
                  </CommonScrollAnimated>
                )}
                <div className="mxd-divider__caption">
                  <Link className="active-cursor-accent" data-cursor-text={cursorText} href={href}>
                    <CommonAnimatedText as="h2" className="reveal-type permanent" animation="revealType">
                      {caption}
                    </CommonAnimatedText>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </BlurSection>
  );
}
