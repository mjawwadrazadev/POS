import BlurSection from "@site/components/animations/BlurSection";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import MxdStatsLineItem from "@site/components/animations/MxdStatsLineItem";
import { CommonScrollAnimated } from "@site/components/animations/CommonScrollAnimated";
import { aboutStats } from "@site/content/marketing";

/** Split block: our approach on the left, numbers on the right. */
export default function AboutApproach() {
  return (
    <BlurSection className="mxd-section padding-top-subtitle padding-bottom-tag-m-subtitle">
      <div className="mxd-container grid-s-container">
        <div className="mxd-block">
          <div className="mxd-block-split">
            <div className="container-fluid p-0">
              <div className="row g-0">
                <div className="col-12 col-xl-6 mxd-grid-item-s mxd-block-split__item manifest-item">
                  <div className="mxd-block-split__inner">
                    <div className="mxd-block-split__subtitle pre-manifest">
                      <CommonScrollAnimated className="anim-uni-in-up" as="p" animation="inUp">
                        <span>/ Our approach</span>
                      </CommonScrollAnimated>
                    </div>
                    <div className="mxd-block-split__manifest">
                      <CommonAnimatedText as="p" className="manifest manifest-s mxd-split-lines" animation="splitLines">
                        Money and stock should never depend on the browser. Prices, tax and totals are calculated on the
                        server, every business&apos;s data is kept separate and every sensitive action is logged.
                        <span>
                          So owners can trust the numbers — and cashiers can simply sell.
                        </span>
                      </CommonAnimatedText>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-xl-6 mxd-grid-item-s mxd-block-split__item manifest-item">
                  <div className="mxd-block-split__inner">
                    <div className="mxd-block-split__subtitle pre-grid">
                      <CommonScrollAnimated className="anim-uni-in-up" as="p" animation="inUp">
                        <span>/ In numbers</span>
                      </CommonScrollAnimated>
                    </div>
                    <div className="mxd-stats-lines">
                      {aboutStats.map((stat) => (
                        <MxdStatsLineItem key={stat.id}>
                          <div className="mxd-stats-lines__number">
                            <p id={stat.id}>{stat.value}</p>
                          </div>
                          <div className="mxd-stats-lines__caption">
                            <p>{stat.caption}</p>
                          </div>
                        </MxdStatsLineItem>
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
