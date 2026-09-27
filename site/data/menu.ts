import { industries } from "@site/content/industries";

export type NavItem = {
  href: string;
  label: string;
  /** Sub-links shown in a dropdown (desktop) or indented list (mobile) */
  children?: { href: string; label: string }[];
};

/** Links in the website header, left to right. */
export const headerNav: NavItem[] = [
  { href: "/", label: "Home" },
  {
    href: "/solutions",
    label: "Solutions",
    children: industries.map((i) => ({ href: `/solutions/${i.slug}`, label: i.name })),
  },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
