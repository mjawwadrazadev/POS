// Pricing plans and the feature comparison on /pricing.
// TODO: confirm prices and plan contents with sales before launch.

export type PlanId = "basic" | "pro" | "premium";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  description: string;
  price: string;
  period: string;
  buttonText: string;
  tag?: string;
  /** Highlighted card */
  featured?: boolean;
};

export const plans: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    tagline: "Start selling in a day.",
    description: "For a single shop, cafe or counter that needs fast billing and simple stock.",
    price: "2,999",
    period: "/branch/month",
    buttonText: "Get Basic",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Run the whole operation.",
    description: "For restaurants, pharmacies and stores with a team, a kitchen or batches to track.",
    price: "5,999",
    period: "/branch/month",
    buttonText: "Get Pro",
    tag: "Most popular",
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Every branch, every rupee.",
    description: "For growing chains that want accounting, FBR invoicing and unlimited branches.",
    price: "9,999",
    period: "/branch/month",
    buttonText: "Get Premium",
    featured: true,
  },
];

/** true = included, false = not included, string = included with this limit/detail */
type Value = boolean | string;

export type FeatureRow = {
  name: string;
  values: Record<PlanId, Value>;
  /** Also listed on the plan cards */
  onCard?: boolean;
};

export type FeatureGroup = { title: string; rows: FeatureRow[] };

const all = { basic: true, pro: true, premium: true };
const proUp = { basic: false, pro: true, premium: true };
const premiumOnly = { basic: false, pro: false, premium: true };

export const featureGroups: FeatureGroup[] = [
  {
    title: "Billing & checkout",
    rows: [
      { name: "Cloud point of sale", values: all, onCard: true },
      { name: "Thermal receipts (58 / 80 mm)", values: all, onCard: true },
      { name: "Barcode scanning — USB, Bluetooth & camera", values: all, onCard: true },
      { name: "Cash, card, wallet & split payments", values: all, onCard: true },
      { name: "Discounts with manager PIN approval", values: all },
      { name: "Orders, refunds & approvals", values: all, onCard: true },
      { name: "WhatsApp receipts", values: all },
      { name: "Offline mode with auto sync", values: all, onCard: true },
      { name: "Shift open / close & cash reconciliation", values: proUp, onCard: true },
    ],
  },
  {
    title: "Products & inventory",
    rows: [
      { name: "Product & menu management", values: all, onCard: true },
      { name: "Barcode label printing", values: all },
      { name: "Stock adjustments with audit log", values: all },
      { name: "Batches, expiry & FEFO selling", values: proUp, onCard: true },
      { name: "Recipe-based ingredient deduction", values: proUp, onCard: true },
      { name: "Stock transfers between branches", values: premiumOnly, onCard: true },
    ],
  },
  {
    title: "Restaurant & service",
    rows: [
      { name: "Kitchen display (KDS) & KOT", values: proUp, onCard: true },
      { name: "Table management (dine-in)", values: proUp, onCard: true },
      { name: "Doctor billing, tokens & doctor share", values: proUp },
    ],
  },
  {
    title: "Team",
    rows: [
      { name: "Staff logins", values: { basic: "Up to 3", pro: "Up to 10", premium: "Unlimited" }, onCard: true },
      { name: "Roles: admin, manager, cashier", values: all },
      { name: "PIN attendance & monthly payroll", values: proUp, onCard: true },
    ],
  },
  {
    title: "Reports & accounting",
    rows: [
      { name: "Sales dashboard", values: all, onCard: true },
      { name: "Revenue, refund & gross profit reports", values: proUp, onCard: true },
      { name: "CSV export", values: proUp },
      { name: "Double-entry accounting & general ledger", values: premiumOnly, onCard: true },
      { name: "Tax payable & balance audit", values: premiumOnly },
    ],
  },
  {
    title: "Tax & compliance",
    rows: [
      { name: "FBR POS integration", values: proUp, onCard: true },
      { name: "FBR Digital Invoicing", values: premiumOnly, onCard: true },
    ],
  },
  {
    title: "Branches & support",
    rows: [
      { name: "Branches", values: { basic: "1", pro: "Up to 3", premium: "Unlimited" }, onCard: true },
      {
        name: "Support",
        values: { basic: "Email", pro: "Phone & WhatsApp", premium: "Priority + onboarding" },
        onCard: true,
      },
      { name: "Setup & training", values: { basic: "Remote", pro: "Remote", premium: "On-site" } },
      { name: "Dedicated account manager", values: premiumOnly },
    ],
  },
];

/** Card bullet points for one plan: limits first, then everything included. */
export function cardFeatures(plan: PlanId): string[] {
  const rows = featureGroups.flatMap((g) => g.rows).filter((r) => r.onCard);
  const limits = rows
    .filter((r) => typeof r.values[plan] === "string")
    .map((r) => (r.name === "Branches" ? `${r.values[plan]} branch${r.values[plan] === "1" ? "" : "es"}` : `${r.name}: ${r.values[plan]}`));
  const included = rows.filter((r) => r.values[plan] === true).map((r) => r.name);
  return [...limits, ...included];
}

export const pricingFaqs = [
  {
    question: "Is the price per branch?",
    answer: "Yes. Each branch (store location) has its own subscription. Adding a terminal or counter inside the same branch costs nothing extra.",
  },
  {
    question: "Can I change my plan later?",
    answer: "Yes. Upgrade or downgrade any time — your products, orders and reports stay exactly where they are.",
  },
  {
    question: "Is setup and training included?",
    answer: "Yes. We set up your store, import your products and train your team. Premium includes on-site training.",
  },
  {
    question: "Do I need to buy special hardware?",
    answer: "No. RST POS runs in the browser on your existing computer or tablet and works with standard thermal printers, label printers and barcode scanners.",
  },
  {
    question: "How do I pay?",
    answer: "Monthly or yearly. Our team will share the payment options when you sign up.",
  },
];
