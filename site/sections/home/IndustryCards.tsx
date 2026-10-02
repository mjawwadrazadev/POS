import Link from "next/link";
import BlurSection from "@site/components/animations/BlurSection";
import { CommonCardBatchAnimated } from "@site/components/animations/CommonScrollAnimated";
import TextScramble from "@site/components/animations/TextScramble";
import PlaceholderImage from "@site/components/common/Placeholder";
import { industryCardImages } from "@site/content/images";
import { getIndustry, type Industry } from "@site/content/industries";

function Tags({ industry, tagClass }: { industry: Industry; tagClass: string }) {
  return (
    <div className="mxd-niche-cards__tags">
      {industry.tagsLeft.map((tag) => (
        <TextScramble key={tag} className={`tag tag-m ${tagClass} mxd-scramble`}>
          {tag}
        </TextScramble>
      ))}
    </div>
  );
}

/** Four highlighted business types in the template's "niche cards" layout. */
export default function IndustryCards() {
  const restaurant = getIndustry("restaurant")!;
  const pharmacy = getIndustry("pharmacy")!;
  const retail = getIndustry("retail")!;
  const cafe = getIndustry("cafe")!;

  return (
    <BlurSection className="mxd-section padding-bottom-grid-l-to-title">
      <div className="mxd-container grid-l-container">
        <div className="mxd-block">
          <div className="mxd-niche-cards">
            <div className="container-fluid p-0">
              <div className="row g-0">
                {/* tall card */}
                <CommonCardBatchAnimated
                  className="col-12 col-xl-4 mxd-niche-cards__column mxd-grid-item animate-card-2"
                  as="div"
                  columns={2}
                >
                  <Link href={`/solutions/${restaurant.slug}`} className="mxd-niche-cards__item" style={{ display: "block" }}>
                    <div className="mxd-niche-cards__inner">
                      <div className="mxd-niche-cards__title">
                        <div className="mxd-niche-cards__name">
                          <p>{restaurant.name}</p>
                        </div>
                        <Tags industry={restaurant} tagClass="tag-medium" />
                      </div>
                      <div className="mxd-niche-cards__descr wide">
                        <p className="t-bold t-medium">
                          {restaurant.lead} <span>{restaurant.highlight}</span>
                        </p>
                      </div>
                      <div className="mxd-niche-cards__image absolute-desktop-bottom">
                        <PlaceholderImage alt={restaurant.name} width={1200} height={1611} src={industryCardImages.restaurant} />
                      </div>
                    </div>
                  </Link>
                </CommonCardBatchAnimated>
                {/* rows */}
                <CommonCardBatchAnimated
                  className="col-12 col-xl-8 mxd-niche-cards__column animate-card-2"
                  as="div"
                  columns={2}
                >
                  <div className="container-fluid p-0">
                    <div className="row g-0">
                      <div className="col-12 mxd-grid-item">
                        <Link href={`/solutions/${pharmacy.slug}`} className="mxd-niche-cards__item" style={{ display: "block" }}>
                          <div className="mxd-niche-cards__inner fixed-height-desktop space-between-desktop">
                            <div className="mxd-niche-cards__title">
                              <div className="mxd-niche-cards__name">
                                <p>{pharmacy.name}</p>
                              </div>
                              <Tags industry={pharmacy} tagClass="tag-medium" />
                            </div>
                            <div className="mxd-niche-cards__descr wide">
                              <p className="t-bold t-medium">
                                {pharmacy.lead} <span>{pharmacy.highlight}</span>
                              </p>
                            </div>
                            <div className="mxd-niche-cards__image absolute-desktop-full">
                              <PlaceholderImage alt={pharmacy.name} width={1320} height={800} src={industryCardImages.pharmacy} />
                              <div className="mxd-niche-cards__gradient gradient-linear" />
                            </div>
                          </div>
                        </Link>
                      </div>
                      <CommonCardBatchAnimated className="col-12 col-xl-6 mxd-grid-item animate-card-2" as="div" columns={2}>
                        <Link href={`/solutions/${retail.slug}`} className="mxd-niche-cards__item" style={{ display: "block" }}>
                          <div className="mxd-niche-cards__inner permanent fixed-height-desktop space-between-desktop">
                            <div className="mxd-niche-cards__title">
                              <div className="mxd-niche-cards__name">
                                <p className="permanent">{retail.name}</p>
                              </div>
                              <Tags industry={retail} tagClass="tag-permanent" />
                            </div>
                            <div className="mxd-niche-cards__descr wide">
                              <p className="t-bold t-medium t-permanent">
                                {retail.lead} <span>{retail.highlight}</span>
                              </p>
                            </div>
                            <div className="mxd-niche-cards__image absolute-desktop-full">
                              <PlaceholderImage alt={retail.name} width={1200} height={974} src={industryCardImages.retail} />
                              <div className="mxd-niche-cards__gradient gradient-radial" />
                            </div>
                          </div>
                        </Link>
                      </CommonCardBatchAnimated>
                      <CommonCardBatchAnimated className="col-12 col-xl-6 mxd-grid-item animate-card-2" as="div" columns={2}>
                        <Link href={`/solutions/${cafe.slug}`} className="mxd-niche-cards__item" style={{ display: "block" }}>
                          <div className="mxd-niche-cards__inner fixed-height-desktop space-between-desktop">
                            <div className="mxd-niche-cards__title">
                              <div className="mxd-niche-cards__name">
                                <p>{cafe.name}</p>
                              </div>
                              <Tags industry={cafe} tagClass="tag-medium" />
                            </div>
                            <div className="mxd-niche-cards__descr short">
                              <p className="t-bold t-medium">
                                {cafe.lead} <span>{cafe.highlight}</span>
                              </p>
                            </div>
                            <div className="mxd-niche-cards__image absolute-desktop-aside">
                              <PlaceholderImage alt={cafe.name} width={800} height={1040} src={industryCardImages.cafe} />
                            </div>
                          </div>
                        </Link>
                      </CommonCardBatchAnimated>
                    </div>
                  </div>
                </CommonCardBatchAnimated>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BlurSection>
  );
}
