import type { Metadata } from "next";
import PageHeadline from "@site/sections/PageHeadline";
import PricingCards from "@site/sections/pages/PricingCards";
import PricingCompare from "@site/sections/pages/PricingCompare";
import IndustryFaqs from "@site/sections/pages/IndustryFaqs";
import PageCTA from "@site/sections/PageCTA";
import { plans, pricingFaqs } from "@site/content/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "RST POS plans: Basic, Pro and Premium — priced per branch per month, with setup and training included.",
};

export default function PricingPage() {
  return (
    <div className="mxd-page-content inner-page-content">
      <PageHeadline
        current="Pricing"
        title={
          <>
            Pricing plans<sup>({plans.length})</sup>
          </>
        }
        lead="Simple per-branch pricing,"
        highlight="setup and training included."
        tags={["Per branch", "Setup included", "Free training", "Upgrade anytime"]}
      />
      <PricingCards />
      <PricingCompare />
      <IndustryFaqs title="Questions about plans and billing" items={pricingFaqs} />
      <PageCTA heading="Not sure which plan fits? Ask us" buttonText="Talk to sales" />
    </div>
  );
}
