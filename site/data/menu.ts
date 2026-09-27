import type { MenuLinkItem } from "@site/types/menu";
import { industries } from "@site/content/industries";
import { siteConfig } from "@site/content/site";

export const solutionLinks: MenuLinkItem[] = industries.map((i) => ({
  href: `/industries/${i.slug}`,
  label: i.name,
}));

export const productLinks: MenuLinkItem[] = [
  { href: "/features", label: "Features" },
  { href: "/industries", label: "All industries" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

export const companyLinks: MenuLinkItem[] = [
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
  { href: siteConfig.loginHref, label: "Store login", external: true },
];
