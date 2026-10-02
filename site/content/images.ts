// Marketing photography (CC0 + Unsplash License, see public/site/images/CREDITS.md).
// Swap any path for a real product screenshot when one is ready.

const dir = "/site/images";

export const heroImage = `${dir}/hero-pos.jpg`;
export const featuresHeadlineImage = `${dir}/features-headline.jpg`;
export const solutionsOverviewImage = `${dir}/solutions-overview.jpg`;

/** Full-width parallax dividers. */
export const dividerImages = {
  cafeCounter: `${dir}/divider-cafe-counter.jpg`,
  offline: `${dir}/divider-offline.jpg`,
  ownersPos: `${dir}/divider-owners-pos.jpg`,
  team: `${dir}/divider-team.jpg`,
  owner: `${dir}/divider-owner.jpg`,
  baristas: `${dir}/divider-baristas.jpg`,
  tabletPos: `${dir}/divider-tablet-pos.jpg`,
  storePos: `${dir}/divider-store-pos.jpg`,
};

/** One high-res photo per business type, keyed by industry slug. */
export const industryImages: Record<string, string> = {
  restaurant: `${dir}/solution-restaurant.jpg`,
  cafe: `${dir}/solution-cafe.jpg`,
  bakery: `${dir}/solution-bakery.jpg`,
  pharmacy: `${dir}/solution-pharmacy.jpg`,
  retail: `${dir}/solution-retail.jpg`,
  supermarket: `${dir}/solution-supermarket.jpg`,
  electronics: `${dir}/solution-electronics.jpg`,
  clothing: `${dir}/solution-clothing.jpg`,
  salon: `${dir}/solution-salon.jpg`,
  hospital: `${dir}/solution-hospital.jpg`,
};

/** Alternate crops for the home page niche cards (tall / aside shapes). */
export const industryCardImages = {
  restaurant: `${dir}/industry-restaurant-tall.jpg`,
  pharmacy: `${dir}/solution-pharmacy.jpg`,
  retail: `${dir}/industry-retail-card.jpg`,
  cafe: `${dir}/industry-cafe-tall.jpg`,
};

/** Industry photo by marquee tag ("Restaurant", "Cafe", ...). */
export function industryImageByTag(tag: string) {
  return industryImages[tag.toLowerCase()];
}

/** One photo per feature module, keyed by feature number. */
export const featureImages: Record<string, string> = {
  "01": `${dir}/feature-billing.jpg`,
  "02": `${dir}/feature-inventory.jpg`,
  "03": `${dir}/feature-kitchen.jpg`,
  "04": `${dir}/feature-ledger.jpg`,
  "05": `${dir}/feature-reports.jpg`,
  "06": `${dir}/feature-team.jpg`,
  "07": `${dir}/feature-fbr.jpg`,
  "08": `${dir}/feature-security.jpg`,
};

/** About page headline banners: "busy counters" then "growing businesses". */
export const aboutBanners = [
  [`${dir}/about-01.jpg`, `${dir}/about-02.jpg`, `${dir}/about-03.jpg`, `${dir}/about-04.jpg`],
  [`${dir}/about-05.jpg`, `${dir}/about-06.jpg`, `${dir}/about-07.jpg`, `${dir}/about-08.jpg`],
];

export const galleryImages = Array.from({ length: 15 }, (_, i) => `${dir}/gallery-${String(i + 1).padStart(2, "0")}.jpg`);
