import BlurSection from "@site/components/animations/BlurSection";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import { CommonScrollAnimated } from "@site/components/animations/CommonScrollAnimated";

type SplitListProps = {
  id?: string;
  leftTitle: string;
  manifest: string;
  rightTitle: string;
  items: { title: string; description: string }[];
};

/** Manifest on the left, titled list on the right (template "Split list"). */
export default function SplitList({ id, leftTitle, manifest, rightTitle, items }: SplitListProps) {
  return (
    <BlurSection id={id} className="mxd-section padding-top-subtitle padding-bottom-default">
      <div className="mxd-container grid-l-container">
        <div className="mxd-block">
          <div className="mxd-block-split">
            <div className="container-fluid p-0">
              <div className="row g-0">
                <div className="col-12 col-xl-6 mxd-grid-item mxd-block-split__item manifest-item">
                  <div className="mxd-block-split__inner">
                    <div className="mxd-block-split__subtitle pre-manifest">
                      <CommonScrollAnimated className="anim-uni-in-up" as="p" animation="inUp">
                        <span>{leftTitle}</span>
                      </CommonScrollAnimated>
                    </div>
                    <div className="mxd-block-split__manifest">
                      <CommonAnimatedText as="p" className="manifest manifest-s mxd-split-lines" animation="splitLines">
                        {manifest}
                      </CommonAnimatedText>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-xl-6 mxd-grid-item mxd-block-split__item manifest-item">
                  <div className="mxd-block-split__inner">
                    <div className="mxd-block-split__subtitle pre-grid">
                      <CommonScrollAnimated className="anim-uni-in-up" as="p" animation="inUp">
                        <span>{rightTitle}</span>
                      </CommonScrollAnimated>
                    </div>
                    <div className="mxd-block-split__data">
                      {items.map((item) => (
                        <div key={item.title} className="split-data__item">
                          <div className="split-data__divider divider-top" />
                          <div className="split-data__name">
                            <CommonScrollAnimated className="anim-uni-in-up" as="p" animation="inUp">
                              {item.title}
                            </CommonScrollAnimated>
                          </div>
                          <div className="split-data__descr">
                            <CommonScrollAnimated className="t-medium anim-uni-in-up" as="p" animation="inUp">
                              {item.description}
                            </CommonScrollAnimated>
                          </div>
                        </div>
                      ))}
                      <div className="split-data__divider divider-bottom" />
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
