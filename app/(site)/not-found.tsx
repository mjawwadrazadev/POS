import PageHeadline from "@site/sections/PageHeadline";
import PageCTA from "@site/sections/PageCTA";

export default function SiteNotFound() {
  return (
    <div className="mxd-page-content inner-page-content">
      <PageHeadline
        current="404"
        title={<>404</>}
        lead="This page doesn't exist —"
        highlight="try the menu, or go back to the home page."
        tags={["Home", "Features", "Industries", "Pricing"]}
      />
      <PageCTA heading="Looking for a POS? Let's talk" />
    </div>
  );
}
