import Link from "next/link";
import BlurSection from "@site/components/animations/BlurSection";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import { CommonScrollAnimated } from "@site/components/animations/CommonScrollAnimated";
import { aboutProcess } from "@site/content/marketing";
import { siteConfig } from "@site/content/site";

/** Manifest + three onboarding steps (template "Process points"). */
export default function AboutProcess() {
  return (
    <BlurSection id="process" className="mxd-section padding-top-manifest-m padding-bottom-tag-m-desktop">
      <div className="mxd-container grid-l-container">
        <div className="mxd-block">
          <div className="mxd-section-manifest pre-points">
            <div className="container-fluid p-0">
              <div className="row g-0">
                <div className="col-12 mxd-grid-item">
                  <div className="mxd-section-manifest__wrap wrap-text-m">
                    <div className="mxd-section-manifest__text manifest-text-m">
                      <Link data-cursor-text="Features" href="/features">
                        <CommonAnimatedText
                          as="span"
                          className="manifest manifest-m mxd-split-lines active-cursor-accent"
                          animation="splitLines"
                        >
                          {siteConfig.name} is built by {siteConfig.company} for businesses that can&apos;t afford a slow
                          checkout.
                          <span>
                            One platform that adapts to restaurants, pharmacies, shops and hospitals — without changing
                            how you work.
                          </span>
                        </CommonAnimatedText>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mxd-block">
          <div className="mxd-process-points">
            <div className="container-fluid p-0">
              <div className="row g-0">
                {aboutProcess.map((step, i) => (
                  <div key={step.title} className="col-12 col-xl-4 mxd-process-points__item mxd-grid-item">
                    <CommonScrollAnimated
                      className="mxd-process-points__divider top anim-uni-clip-in"
                      as="div"
                      animation="clipIn"
                    />
                    <CommonScrollAnimated className="mxd-process-points__title anim-uni-in-up" as="div" animation="inUp">
                      <div className="mxd-process-points__icon">
                        <i className={`ph ${step.icon}`} />
                      </div>
                      <p>{step.title}</p>
                    </CommonScrollAnimated>
                    <div className="mxd-process-points__descr">
                      <CommonAnimatedText as="p" className="t-medium mxd-split-lines" animation="splitLines">
                        {step.description}
                      </CommonAnimatedText>
                    </div>
                    <CommonScrollAnimated className="mxd-process-points__time anim-uni-in-up" as="div" animation="inUp">
                      <span className="tag tag-m meta-time">{step.time}</span>
                    </CommonScrollAnimated>
                    {i === aboutProcess.length - 1 && (
                      <CommonScrollAnimated
                        className="mxd-process-points__divider bottom anim-uni-clip-in"
                        as="div"
                        animation="clipIn"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BlurSection>
  );
}
