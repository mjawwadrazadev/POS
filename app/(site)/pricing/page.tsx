import type { Metadata } from "next";
import PageHeadline from "@site/sections/PageHeadline";
import PricingCards from "@site/sections/pages/PricingCards";
import ParallaxDivider from "@site/sections/ParallaxDivider";
import PageCTA from "@site/sections/PageCTA";
import { pricingPlans } from "@site/content/marketing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple monthly plans for RST POS: Billing, Billing + Accounting and Enterprise.",
};

export default function PricingPage() {
  return (
    <div className="mxd-page-content inner-page-content">
      <PageHeadline
        current="Pricing"
        title={
          <>
            Pricing plans<sup>({pricingPlans.length})</sup>
          </>
        }
        lead="Simple monthly plans,"
        highlight="no hidden fees."
        tags={["Setup included", "Free training", "Cancel anytime", "Local support"]}
      />
      <PricingCards />
      <ParallaxDivider />
      <PageCTA heading="Not sure which plan fits? Ask us" buttonText="Talk to sales" />
    </div>
  );
}
