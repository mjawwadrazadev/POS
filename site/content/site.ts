// Brand, contact details and navigation for the public website.
// TODO: replace the placeholder phone/address/social links with the real ones before launch.

export const siteConfig = {
  name: "RST POS",
  shortName: "RST",
  wordmark: ["RST", "POS"] as const,
  company: "NIB IT Solutions",
  tagline: "One point of sale for every kind of business",
  description:
    "RST POS is a cloud point of sale for restaurants, cafes, bakeries, pharmacies, retail stores, supermarkets, salons and hospitals — billing, inventory, kitchen display, accounting and FBR invoicing in one system.",
  email: "info@rstpos.com",
  phone: "+92 300 0000000",
  phoneHref: "tel:+923000000000",
  whatsappHref: "https://wa.me/923000000000",
  address: ["Office address line 1", "City, Pakistan"],
  mapHref: "https://maps.google.com",
  loginHref: "/login",
  demoHref: "/contact",
};

export const socialLinks = [
  { name: "WhatsApp", url: siteConfig.whatsappHref },
  { name: "Facebook", url: "https://www.facebook.com/" },
  { name: "Instagram", url: "https://www.instagram.com/" },
  { name: "LinkedIn", url: "https://www.linkedin.com/" },
  { name: "YouTube", url: "https://www.youtube.com/" },
];

export const mailtoHref = `mailto:${siteConfig.email}?subject=${encodeURIComponent("RST POS enquiry")}`;
