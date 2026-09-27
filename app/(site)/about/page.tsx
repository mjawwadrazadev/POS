import type { Metadata } from "next";
import AboutHeadline from "@site/sections/pages/AboutHeadline";
import ParallaxDivider from "@site/sections/ParallaxDivider";
import AboutProcess from "@site/sections/pages/AboutProcess";
import DoubleMarquee from "@site/sections/DoubleMarquee";
import AboutApproach from "@site/sections/pages/AboutApproach";
import PageCTA from "@site/sections/PageCTA";

export const metadata: Metadata = {
  title: "About Us",
  description: "RST POS is built by NIB IT Solutions for businesses that can't afford a slow checkout.",
};

export default function AboutPage() {
  return (
    <>
      <AboutHeadline />
      <ParallaxDivider />
      <AboutProcess />
      <DoubleMarquee />
      <AboutApproach />
      <PageCTA />
    </>
  );
}
