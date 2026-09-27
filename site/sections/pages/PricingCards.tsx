import Link from "next/link";
import CommonLoadAnimation, { CommonLoadFade } from "@site/components/animations/CommonLoadAnimation";
import { CommonScrollAnimated, CommonCardBatchAnimated } from "@site/components/animations/CommonScrollAnimated";
import TextScramble from "@site/components/animations/TextScramble";
import { pricingPlans } from "@site/content/marketing";

/** Three pricing plans (template pricing table). */
export default function PricingCards() {
  return (
    <CommonLoadAnimation>
      <div className="mxd-section">
        <div className="mxd-container grid-l-container">
          <div className="mxd-block">
            <CommonLoadFade index={0}>
              <div className="mxd-pricing-table loading-fade">
                <div className="container-fluid p-0">
                  <div className="row g-0">
                    {pricingPlans.map((plan, idx) => {
                      const blurId = `pricing-blur-${idx}`;
                      const isCustom = plan.price === "Custom";
                      return (
                        <CommonCardBatchAnimated
                          key={plan.name}
                          className="col-12 col-xl-4 mxd-pricing-table__item mxd-grid-item animate-card-3"
                          as="div"
                          columns={3}
                        >
                          <div className="mxd-pricing-table__inner">
                            <div className="mxd-pricing-table__bg">
                              <svg xmlns="http://www.w3.org/2000/svg" width={200} height={200} version="1.1" viewBox="0 0 200 200">
                                <g filter={`url(#${blurId})`}>
                                  <path
                                    fill="var(--highlight)"
                                    d="M200,200c0,55.2-44.8,100-100,100S0,255.2,0,200s44.8-100,100-100,100,44.8,100,100Z"
                                  />
                                </g>
                                <defs>
                                  <filter
                                    id={blurId}
                                    x={0}
                                    y={0}
                                    width={3000}
                                    height={5000}
                                    filterUnits="userSpaceOnUse"
                                    colorInterpolationFilters="sRGB"
                                  >
                                    <feFlood floodOpacity={0} result="BackgroundImageFix" />
                                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                                    <feGaussianBlur stdDeviation={60} result="effect1_foregroundBlur" />
                                  </filter>
                                </defs>
                              </svg>
                            </div>
                            {plan.tag && (
                              <div className="mxd-pricing-table__tag">
                                <span className="tag tag-m tag-bg accent">{plan.tag}</span>
                              </div>
                            )}
                            <div className="mxd-pricing-table__data">
                              <div className="pricing-data__header">
                                <CommonScrollAnimated
                                  className={`pricing-header__title ${isCustom ? "small no-margin" : ""} anim-uni-in-up`}
                                  as="p"
                                  animation="inUp"
                                >
                                  {plan.name}
                                </CommonScrollAnimated>
                                <CommonScrollAnimated className="pricing-header__descr t-bold anim-uni-in-up" as="p" animation="inUp">
                                  {plan.description}
                                </CommonScrollAnimated>
                              </div>
                              <div className="pricing-data__info">
                                {!isCustom && (
                                  <div className="pricing-data__price">
                                    <CommonScrollAnimated className="pricing-data__num anim-uni-in-up" as="div" animation="inUp">
                                      <span className="pricing-data__currency">{plan.currency}</span>
                                      <span className="pricing-data__amount">{plan.price}</span>
                                      <span className="pricing-data__period">{plan.period}</span>
                                    </CommonScrollAnimated>
                                    <CommonScrollAnimated
                                      className="pricing-data__caption t-small t-muted t-140 anim-uni-in-up"
                                      as="p"
                                      animation="inUp"
                                    >
                                      {plan.caption}
                                    </CommonScrollAnimated>
                                  </div>
                                )}
                                <CommonScrollAnimated className="pricing-data__btnholder anim-uni-in-up" as="div" animation="inUp">
                                  <Link
                                    className="btn btn-default-icon btn-default-outline btn-default-fullwidth slide-right"
                                    href={plan.buttonLink}
                                  >
                                    <TextScramble className="btn-caption mxd-scramble">{plan.buttonText}</TextScramble>
                                    <i className="btn-icon">
                                      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 18 18">
                                        <path d="M10.8,0v3.6h-3.6V0h3.6ZM14.4,10.8h3.6v-3.6h-3.6v-3.6h-3.6v3.6H0v3.6h10.8v3.6h3.6v-3.6ZM10.8,14.4h-3.6v3.6h3.6v-3.6Z" />
                                      </svg>
                                    </i>
                                  </Link>
                                </CommonScrollAnimated>
                              </div>
                            </div>
                            <div className="mxd-pricing-table__plan">
                              <CommonScrollAnimated className="pricing-plan__caption t-bold anim-uni-in-up" as="p" animation="inUp">
                                What is included:
                              </CommonScrollAnimated>
                              <div className="pricing-plan__list">
                                <ul className="mxd-check-list">
                                  {plan.features.map((feat) => (
                                    <CommonScrollAnimated key={feat} className="anim-uni-in-up" as="li" animation="inUp">
                                      <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} version="1.1" viewBox="0 0 18 18">
                                        <path d="M18,6.8h-4.5v4.5h-4.5v4.5h-4.5v-4.5h4.5v-4.5h4.5V2.3h4.5v4.5ZM0,6.7v4.5h4.5v-4.5H0Z" />
                                      </svg>
                                      <span>{feat}</span>
                                    </CommonScrollAnimated>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <CommonScrollAnimated className="mxd-pricing-table__link anim-uni-in-up" as="div" animation="inUp">
                              <Link href="/contact">Need more info? Let&apos;s talk.</Link>
                            </CommonScrollAnimated>
                          </div>
                        </CommonCardBatchAnimated>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CommonLoadFade>
          </div>
        </div>
      </div>
    </CommonLoadAnimation>
  );
}
