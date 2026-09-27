import BlurSection from "@site/components/animations/BlurSection";
import CommonAnimatedText from "@site/components/animations/CommonAnimatedText";
import { CommonScrollAnimated } from "@site/components/animations/CommonScrollAnimated";
import SectionTitle from "@site/sections/SectionTitle";
import { integrations } from "@site/content/marketing";

function IntegrationItem({ name }: { name: string }) {
  return (
    <div className="mxd-tech-stack__item">
      <CommonScrollAnimated className="mxd-tech-stack__divider divider-top anim-uni-clip-in" as="div" animation="clipIn" />
      <div className="mxd-tech-stack__logo">
        {/* TODO: replace the initials with partner/hardware logos */}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            fontSize: "1.4rem",
            fontWeight: 700,
            opacity: 0.6,
          }}
        >
          {name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 3)
            .toUpperCase()}
        </span>
      </div>
      <CommonScrollAnimated className="mxd-tech-stack__name anim-uni-slide-down" as="div" animation="slideDownLine">
        <p>{name}</p>
      </CommonScrollAnimated>
      <CommonScrollAnimated className="mxd-tech-stack__divider divider-bottom anim-uni-clip-in" as="div" animation="clipIn" />
    </div>
  );
}

/** Hardware & integrations in the template's three-column "tech stack" list. */
export default function IntegrationsList() {
  const size = Math.ceil(integrations.length / 3);
  const columns = [integrations.slice(0, size), integrations.slice(size, size * 2), integrations.slice(size * 2)];

  return (
    <BlurSection className="mxd-section padding-top-number padding-bottom-default">
      <div className="mxd-container grid-l-container">
        <SectionTitle
          number="I/04"
          variant="pre-grid-desktop"
          title={
            <>
              Works with
              <br />
              your hardware
            </>
          }
        />
        <div className="mxd-block">
          <div className="container-fluid p-0">
            <div className="row g-0">
              <div className="col-12 col-xl-4 mxd-aside-descr mxd-grid-item">
                <CommonAnimatedText as="p" className="t-bold t-large t-aside mxd-split-lines" animation="splitLines">
                  Plug in the printers and scanners you already have
                  <span>and connect to FBR in a few clicks.</span>
                </CommonAnimatedText>
              </div>
              <div className="col-12 col-xl-8">
                <div className="container-fluid p-0">
                  <div className="row g-0 mxd-tech-stack">
                    {columns.map((col, i) => (
                      <div key={i} className="col-12 col-md-4 mxd-grid-item">
                        <div className="mxd-tech-stack__column">
                          {col.map((name) => (
                            <IntegrationItem key={name} name={name} />
                          ))}
                        </div>
                      </div>
                    ))}
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
