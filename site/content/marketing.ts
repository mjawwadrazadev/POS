// Copy for the home, features, about, pricing and FAQ pages.
// TODO: confirm the pricing numbers with sales before launch.

export const homeStats = [
  { id: "stats-counter-1", value: "10", caption: "Business types supported out of the box" },
  { id: "stats-counter-2", value: "100%", caption: "Server-calculated prices, tax and totals" },
  { id: "stats-counter-3", value: "0", caption: "Sales lost when the internet goes down" },
  { id: "stats-counter-4", value: "24/7", caption: "Access to your reports from anywhere" },
];

export type Feature = {
  number: string;
  name: string;
  lead: string;
  highlight: string;
  tagsLeft: string[];
  tagsRight: string[];
};

export const features: Feature[] = [
  {
    number: "01",
    name: "POS Billing",
    lead: "A fast, touch-friendly till with barcode scanning,",
    highlight: "split payments, discounts with manager approval and 80mm thermal receipts.",
    tagsLeft: ["Barcode", "Split payment", "Discounts"],
    tagsRight: ["Thermal receipt", "WhatsApp receipt", "Shifts"],
  },
  {
    number: "02",
    name: "Inventory & Batches",
    lead: "Stock that never goes below zero,",
    highlight: "with FEFO batches, expiry blocking, barcode labels and branch transfers.",
    tagsLeft: ["FEFO", "Expiry", "Labels"],
    tagsRight: ["Transfers", "Adjustments", "Audit log"],
  },
  {
    number: "03",
    name: "Kitchen Display",
    lead: "Orders reach the kitchen the moment they're placed,",
    highlight: "and move from Queued to Preparing, Ready and Served in real time.",
    tagsLeft: ["KOT", "KDS", "Tables"],
    tagsRight: ["Dine-in", "Takeaway", "Delivery"],
  },
  {
    number: "04",
    name: "Accounting & Ledger",
    lead: "A real double-entry general ledger,",
    highlight: "where every sale, refund, consultation and payroll posts balanced entries automatically.",
    tagsLeft: ["General ledger", "Tax payable", "Balance audit"],
    tagsRight: ["Refund reversals", "Payroll", "Archive"],
  },
  {
    number: "05",
    name: "Reports & Analytics",
    lead: "Gross revenue, refunds, net revenue and gross profit,",
    highlight: "month by month with growth trends and CSV export.",
    tagsLeft: ["Net revenue", "Gross profit", "Growth"],
    tagsRight: ["CSV export", "Doctor reports", "Dashboard"],
  },
  {
    number: "06",
    name: "Team, HR & Payroll",
    lead: "Staff roles, PIN attendance and monthly payroll,",
    highlight: "with admin, manager and cashier permissions enforced on every screen.",
    tagsLeft: ["Roles", "PIN login", "Attendance"],
    tagsRight: ["Payroll", "Branches", "Permissions"],
  },
  {
    number: "07",
    name: "FBR Integration",
    lead: "Optional FBR POS Integration and Digital Invoicing,",
    highlight: "with the FBR invoice number and QR code printed on every receipt.",
    tagsLeft: ["POS Integration", "Digital Invoicing", "QR code"],
    tagsRight: ["Per-store setup", "Retry queue", "Tax"],
  },
  {
    number: "08",
    name: "Offline Mode & Security",
    lead: "Keep selling without internet,",
    highlight: "with automatic sync, rate-limited logins, audit logs and data isolated per business.",
    tagsLeft: ["Offline sales", "Auto sync", "Audit log"],
    tagsRight: ["Rate limiting", "Store Code + PIN", "Tenant isolation"],
  },
];

/** Integrations & hardware list on the home page (rendered as a three-column list) */
export const integrations = [
  "Any Windows / Android printer",
  "USB thermal printers",
  "Bluetooth printers",
  "Network / Wi-Fi printers",
  "Label printers (TSPL, ZPL)",
  "Cash drawer",
  "USB & wireless scanners",
  "Serial / COM scanners",
  "Camera barcode scanning",
  "Barcode label printing",
  "WhatsApp receipts",
  "FBR invoicing",
];

export const aboutProcess = [
  {
    icon: "ph-chats-circle",
    title: "Consult",
    description: "We learn how your business runs — counters, branches, menu or catalogue, tax and reporting needs.",
    time: "Day 1",
  },
  {
    icon: "ph-gear-six",
    title: "Set up",
    description: "We create your store with the right business type, products, staff, tables and printers so you're ready to sell.",
    time: "1-3 days",
  },
  {
    icon: "ph-rocket-launch",
    title: "Go live",
    description: "Your team is trained on the till, and we stay on call while you run your first days on RST POS.",
    time: "Ongoing support",
  },
];

export const aboutStats = [
  { id: "stats-counter-1", value: "10", caption: "Business types, one platform" },
  { id: "stats-counter-2", value: "3", caption: "Store roles: admin, manager, cashier" },
  { id: "stats-counter-3", value: "80mm", caption: "Thermal receipt printing" },
  { id: "stats-counter-4", value: "1", caption: "Dashboard for all your branches" },
];

export type PricingPlan = {
  name: string;
  tag?: string;
  description: string;
  currency: string;
  price: string;
  period: string;
  caption: string;
  buttonText: string;
  buttonLink: string;
  features: string[];
};

export const pricingPlans: PricingPlan[] = [
  {
    name: "Billing",
    description: "Everything a single store needs to sell, print and manage stock.",
    currency: "Rs",
    price: "4,999",
    period: "/month",
    caption: "Billed monthly per store",
    buttonText: "Get started",
    buttonLink: "/contact",
    features: [
      "POS billing & thermal receipts",
      "Products, barcodes & inventory",
      "Orders, refunds & approvals",
      "Kitchen display for food businesses",
      "Sales dashboard & reports",
      "Offline mode with auto sync",
    ],
  },
  {
    name: "Billing + Accounting",
    tag: "Most popular",
    description: "For growing businesses that want their books to run themselves.",
    currency: "Rs",
    price: "7,999",
    period: "/month",
    caption: "Billed monthly per store",
    buttonText: "Get started",
    buttonLink: "/contact",
    features: [
      "Everything in Billing",
      "Double-entry general ledger",
      "Tax payable & balance audit",
      "Staff attendance & payroll",
      "Multiple branches & stock transfers",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    description: "Chains, franchises and hospitals with custom needs.",
    currency: "",
    price: "Custom",
    period: "",
    caption: "",
    buttonText: "Talk to sales",
    buttonLink: "/contact",
    features: [
      "Everything in Billing + Accounting",
      "Unlimited branches & staff",
      "FBR POS Integration setup",
      "Custom reports & data export",
      "On-site training",
      "Dedicated account manager",
    ],
  },
];

export const generalFaqs = [
  {
    question: "What kinds of businesses can use RST POS?",
    answer:
      "RST POS is set up for 10 business types: restaurants, cafes, bakeries, pharmacies, retail stores, supermarkets, electronics & mobile shops, clothing stores, salons and hospitals. Each one gets the screens, fields and terms that fit how it works.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No. RST POS runs in the browser on any computer or tablet. You only need a thermal printer and a barcode scanner if your business uses them.",
  },
  {
    question: "What happens if the internet goes down?",
    answer:
      "You can keep selling. Offline sales are saved on the terminal and sync automatically when the connection returns, without duplicates.",
  },
  {
    question: "How do cashiers log in?",
    answer:
      "Cashiers use your Store Code and their personal 4-digit PIN for quick terminal login. Admins and managers can also sign in with email and password.",
  },
  {
    question: "Can I run multiple branches?",
    answer:
      "Yes. Add branches within your plan, assign staff to each one and transfer stock between them with full batch history.",
  },
  {
    question: "Is FBR integration included?",
    answer:
      "FBR POS Integration and Digital Invoicing can be enabled per store. Once set up, each receipt carries the FBR invoice number and QR code.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Every business's data is isolated, prices and totals are calculated on the server, logins are rate-limited and every important action is recorded in an audit log.",
  },
  {
    question: "How do we get started?",
    answer:
      "Send us a message or call. We'll set up your store, import your products, create your staff logins and train your team.",
  },
];

export const marqueeTags = [
  "Restaurant",
  "Cafe",
  "Bakery",
  "Pharmacy",
  "Retail",
  "Supermarket",
  "Electronics",
  "Clothing",
  "Salon",
  "Hospital",
];
