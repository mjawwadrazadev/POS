import HomeHero from "@site/sections/home/HomeHero";
import HomeStats from "@site/sections/home/HomeStats";
import IndustryCards from "@site/sections/home/IndustryCards";
import FeatureList from "@site/sections/home/FeatureList";
import ParallaxDivider from "@site/sections/ParallaxDivider";
import { dividerImages } from "@site/content/images";
import IndustriesGrid from "@site/sections/IndustriesGrid";
import IntegrationsList from "@site/sections/home/IntegrationsList";
import HomeCTA from "@site/sections/home/HomeCTA";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeStats />
      <IndustryCards />
      <FeatureList />
      <ParallaxDivider image={dividerImages.cafeCounter} />
      <IndustriesGrid limit={6} />
      <ParallaxDivider
        image={dividerImages.offline}
        caption="Keeps selling, even when the internet doesn't"
        href="/features"
        buttonText="See all features"
        cursorText="Features"
      />
      <IntegrationsList />
      <ParallaxDivider image={dividerImages.ownersPos} />
      <HomeCTA />
    </>
  );
}
