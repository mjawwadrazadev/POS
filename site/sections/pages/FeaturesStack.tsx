"use client";

import TextScramble from "@site/components/animations/TextScramble";
import CommonServicesStack, { ServicesStackSlot } from "@site/components/animations/CommonServicesStack";
import PlaceholderImage from "@site/components/common/Placeholder";
import { features, type Feature } from "@site/content/marketing";

function Tag({ children }: { children: string }) {
  return <TextScramble className="tag tag-s-mobile mxd-scramble">{children}</TextScramble>;
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <ServicesStackSlot part="card" index={index}>
      <div className="mxd-stack-services__card">
        <ServicesStackSlot part="wrapper" index={index}>
          <div className="services-card__wrapper">
            <div className="services-card__content">
              <div className="services-card__info">
                <div className="services-card__subtitle">
                  <Tag>{`${feature.number} / Features`}</Tag>
                </div>
                <div className="services-card__title">
                  <ServicesStackSlot part="title" index={index}>
                    <div className="services-card__title-text">{feature.name}</div>
                  </ServicesStackSlot>
                </div>
                <ServicesStackSlot part="tags" index={index}>
                  <div className="services-card__tags">
                    <div className="tags-column">
                      {feature.tagsLeft.map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))}
                    </div>
                    <div className="tags-column">
                      {feature.tagsRight.map((t) => (
                        <Tag key={t}>{t}</Tag>
                      ))}
                    </div>
                  </div>
                </ServicesStackSlot>
              </div>
              <ServicesStackSlot part="descr" index={index}>
                <div className="t-large t-bold services-card__descr">
                  {feature.lead} <span>{feature.highlight}</span>
                </div>
              </ServicesStackSlot>
            </div>
            <ServicesStackSlot part="image" index={index}>
              <div className="services-card__image">
                <PlaceholderImage width={1200} height={1300} alt={`${feature.name} screen`} />
                <div className="services-card__cover" />
              </div>
            </ServicesStackSlot>
          </div>
        </ServicesStackSlot>
      </div>
    </ServicesStackSlot>
  );
}

/** Stacking feature cards (template services stack). */
export default function FeaturesStack() {
  return (
    <div id="features" className="mxd-section">
      <div className="mxd-container fullwidth-container">
        <div className="mxd-block">
          <CommonServicesStack className="mxd-stack-services">
            {features.map((feature, index) => (
              <FeatureCard key={feature.number} feature={feature} index={index} />
            ))}
          </CommonServicesStack>
        </div>
      </div>
    </div>
  );
}
