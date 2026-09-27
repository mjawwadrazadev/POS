import type { Metadata } from "next";
import FaqHeadline from "@site/sections/pages/FaqHeadline";
import ParallaxDivider from "@site/sections/ParallaxDivider";
import PageCTA from "@site/sections/PageCTA";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about RST POS setup, hardware, offline mode, branches, FBR integration and security.",
};

export default function FaqPage() {
  return (
    <div className="mxd-page-content inner-page-content">
      <FaqHeadline />
      <ParallaxDivider />
      <PageCTA heading="Still have questions? Let's talk" />
    </div>
  );
}
