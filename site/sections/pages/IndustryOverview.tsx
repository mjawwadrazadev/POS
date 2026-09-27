import BlurSection from "@site/components/animations/BlurSection";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import { CommonScrollAnimated } from "@site/components/animations/CommonScrollAnimated";
import type { Industry } from "@site/content/industries";

/** Overview manifest with a spec sheet (template "Overview split list"). */
export default function IndustryOverview({ industry }: { industry: Industry }) {
  return (
    <BlurSection id="overview" className="mxd-section padding-top-subtitle padding-bottom-default">
      <div className="mxd-container grid-l-container">
        <div className="mxd-block">
          <div className="mxd-block-split">
            <div className="container-fluid p-0">
              <div className="row g-0">
                <div className="col-12 col-xl-6 mxd-grid-item mxd-block-split__item">
                  <div className="mxd-block-split__inner">
                    <div className="mxd-block-split__subtitle pre-manifest">
                      <CommonScrollAnimated className="anim-uni-in-up" as="p" animation="inUp">
                        <span>/ Overview</span>
                      </CommonScrollAnimated>
                    </div>
                    <div className="mxd-block-split__manifest">
                      <CommonAnimatedText as="p" className="manifest manifest-s mxd-split-lines" animation="splitLines">
                        {industry.overview}
                      </CommonAnimatedText>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-xl-6 mxd-grid-item mxd-block-split__item">
                  <div className="mxd-block-split__inner">
                    <div className="mxd-block-split__subtitle pre-grid">
                      <CommonScrollAnimated className="anim-uni-in-up" as="p" animation="inUp">
                        <span>/ At a glance</span>
                      </CommonScrollAnimated>
                    </div>
                    <div className="mxd-block-split__info">
                      {industry.specs.map((spec, i) => (
                        <div key={spec.title} className="split-info__item">
                          <div className="split-info__divider divider-top" />
                          <div className="split-info__details">
                            <CommonScrollAnimated className="anim-uni-in-up" as="p" animation="inUp">
                              {spec.title}
                              <br />
                              <span>{spec.value}</span>
                            </CommonScrollAnimated>
                          </div>
                          {i === industry.specs.length - 1 && <div className="split-info__divider divider-bottom" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BlurSection>
  );
}
