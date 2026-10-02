import type { Metadata } from "next";
import FeaturesHeadline from "@site/sections/pages/FeaturesHeadline";
import FeaturesStack from "@site/sections/pages/FeaturesStack";
import ParallaxDivider from "@site/sections/ParallaxDivider";
import { dividerImages } from "@site/content/images";
import IntegrationsList from "@site/sections/home/IntegrationsList";
import PageCTA from "@site/sections/PageCTA";

export const metadata: Metadata = {
  title: "Features",
  description:
    "POS billing, inventory with FEFO batches, kitchen display, double-entry accounting, reports, HR & payroll, FBR integration and offline mode.",
};

export default function FeaturesPage() {
  return (
    <>
      <FeaturesHeadline />
      <FeaturesStack />
      <ParallaxDivider image={dividerImages.tabletPos} />
      <IntegrationsList />
      <PageCTA heading="See every feature on your own products" />
    </>
  );
}
