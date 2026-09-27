import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHeadline from "@site/sections/PageHeadline";
import ParallaxDivider from "@site/sections/ParallaxDivider";
import IndustryOverview from "@site/sections/pages/IndustryOverview";
import SplitList from "@site/sections/SplitList";
import IndustryFaqs from "@site/sections/pages/IndustryFaqs";
import NextIndustryLink from "@site/sections/pages/NextIndustryLink";
import PageCTA from "@site/sections/PageCTA";
import { getIndustry, industries } from "@site/content/industries";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const industry = getIndustry((await params).slug);
  if (!industry) return {};
  return {
    title: `${industry.name} POS`,
    description: `${industry.lead} ${industry.highlight}`,
  };
}

export default async function IndustryPage({ params }: Params) {
  const industry = getIndustry((await params).slug);
  if (!industry) notFound();

  return (
    <div className="mxd-page-content inner-page-content">
      <PageHeadline
        current={industry.name}
        parents={[{ href: "/industries", label: "Industries" }]}
        title={`${industry.name} POS`}
        size="medium"
        lead={industry.lead}
        highlight={industry.highlight}
        tags={[...industry.tagsLeft, ...industry.tagsRight]}
      />
      <ParallaxDivider />
      <IndustryOverview industry={industry} />
      <SplitList
        leftTitle="/ Why it works"
        manifest={industry.valueProp}
        rightTitle="/ Key benefits"
        items={industry.benefits}
      />
      <SplitList
        leftTitle="/ How it works"
        manifest={industry.workflowIntro}
        rightTitle="/ Your day on RST POS"
        items={industry.workflow}
      />
      <ParallaxDivider />
      <IndustryFaqs name={industry.name} items={industry.faqs} />
      <NextIndustryLink currentSlug={industry.slug} />
      <PageCTA heading={`Get RST POS for your ${industry.name.toLowerCase()}`} />
    </div>
  );
}
