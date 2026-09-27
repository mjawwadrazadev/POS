import Link from "next/link";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import MxdStatsLineItem from "@site/components/animations/MxdStatsLineItem";
import { CommonScrollAnimated } from "@site/components/animations/CommonScrollAnimated";
import TextScramble from "@site/components/animations/TextScramble";
import { homeStats } from "@site/content/marketing";

export default function HomeStats() {
  return (
    <div id="about" className="mxd-section padding-top-number padding-bottom-tag-m">
      <div className="mxd-container grid-l-container">
        <div className="mxd-block">
          <div className="mxd-section-title">
            <div className="container-fluid p-0">
              <div className="row g-0">
                <div className="col-12 col-xl-4 mxd-grid-item">
                  <div className="mxd-section-title__data top-number">
                    <CommonScrollAnimated
                      className="mxd-section-title__number pre-manifest anim-uni-in-up"
                      as="div"
                      animation="inUp"
                    >
                      <TextScramble className="title-number mxd-scramble">A/01</TextScramble>
                    </CommonScrollAnimated>
                  </div>
                </div>
                <div className="col-12 col-xl-8 mxd-grid-item">
                  <div className="mxd-section-title__manifest title-manifest-s no-padding-mobile">
                    <Link data-cursor-text="About us" href="/about">
                      <CommonAnimatedText
                        as="span"
                        className="manifest manifest-s mxd-split-lines active-cursor-accent"
                        animation="splitLines"
                      >
                        Billing, inventory, kitchen, accounts and staff — RST POS brings every counter of your business
                        into one fast, reliable system that keeps working even when the internet doesn&apos;t.
                      </CommonAnimatedText>
                    </Link>
                  </div>
                  <div className="mxd-stats-lines manifest-title">
                    {homeStats.map((fact) => (
                      <MxdStatsLineItem key={fact.id}>
                        <div className="mxd-stats-lines__number">
                          <p id={fact.id}>{fact.value}</p>
                        </div>
                        <div className="mxd-stats-lines__caption">
                          <p>{fact.caption}</p>
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
  );
}
