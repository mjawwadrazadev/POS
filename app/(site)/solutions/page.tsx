import type { Metadata } from "next";
import PageHeadline from "@site/sections/PageHeadline";
import IndustriesGrid from "@site/sections/IndustriesGrid";
import PageCTA from "@site/sections/PageCTA";
import { industries } from "@site/content/industries";

export const metadata: Metadata = {
  title: "Solutions",
  description: "RST POS is set up for restaurants, cafes, bakeries, pharmacies, retail, supermarkets, electronics, clothing, salons and hospitals.",
};

export default function SolutionsPage() {
  return (
    <div className="mxd-page-content inner-page-content">
      <PageHeadline
        current="Solutions"
        title={
          <>
            Solutions<sup>({industries.length})</sup>
          </>
        }
        lead="One platform, built for your business —"
        highlight="set up for the way you sell."
        tags={["Food & beverage", "Retail", "Healthcare", "Services"]}
      />
      <IndustriesGrid showTitle={false} />
      <PageCTA heading="Don't see your business? Let's talk" />
    </div>
  );
}
