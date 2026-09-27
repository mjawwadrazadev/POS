import type { Metadata } from "next";
import ContactHeadline from "@site/sections/pages/ContactHeadline";
import ParallaxDivider from "@site/sections/ParallaxDivider";

export const metadata: Metadata = {
  title: "Contact",
  description: "Book a free RST POS demo or ask for a price for your business.",
};

export default function ContactPage() {
  return (
    <div className="mxd-page-content inner-page-content">
      <ContactHeadline />
      <ParallaxDivider />
    </div>
  );
}
