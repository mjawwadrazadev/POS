// Business types RST POS is set up for (mirrors lib/config/verticals.ts).
// Each one gets its own page at /industries/[slug].

export type Industry = {
  slug: string;
  number: string;
  name: string;
  /** Short line used on cards and menus */
  cardText: string;
  lead: string;
  highlight: string;
  tagsLeft: string[];
  tagsRight: string[];
  overview: string;
  specs: { title: string; value: string }[];
  valueProp: string;
  benefits: { title: string; description: string }[];
  workflowIntro: string;
  workflow: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
};

const commonFaqs = {
  offline: {
    question: "What happens if the internet goes down?",
    answer:
      "The till keeps selling. Sales are saved on the terminal and sync automatically when the connection is back, without creating duplicate orders.",
  },
  hardware: {
    question: "Which hardware do I need?",
    answer:
      "Any computer or tablet with a modern browser. RST POS prints to 80mm USB, Bluetooth and network ESC/POS thermal printers and works with standard USB barcode scanners or the device camera.",
  },
  fbr: {
    question: "Can invoices be reported to FBR?",
    answer:
      "Yes. FBR POS Integration and Digital Invoicing can be switched on per store; the FBR invoice number is printed on the receipt with a QR code.",
  },
};

export const industries: Industry[] = [
  {
    slug: "restaurant",
    number: "[01]",
    name: "Restaurant",
    cardText: "Dine-in, takeaway and delivery with tables, KOT and a live kitchen display.",
    lead: "Take orders at the table, send them to the kitchen instantly",
    highlight: "and close the bill in seconds.",
    tagsLeft: ["Table management", "KOT", "Kitchen display"],
    tagsRight: ["Split bill", "Recipe deduction", "Delivery"],
    overview:
      "A restaurant POS built around the table: pick a table, punch the order, and the KOT lands on the kitchen screen before the waiter walks away.",
    specs: [
      { title: "Order types", value: "Dine-in, Takeaway, Delivery" },
      { title: "Kitchen", value: "KOT tickets & Kitchen Display System" },
      { title: "Payments", value: "Cash, Card, Wallet, Split payment" },
      { title: "Receipts", value: "80mm thermal & WhatsApp receipt" },
    ],
    valueProp:
      "Faster table turns, fewer kitchen mistakes and a clear picture of what every dish earns — from the first order of the day to the closing shift report.",
    benefits: [
      {
        title: "Tables that stay in sync",
        description: "Create your floor's tables in Settings and choose them on every dine-in order, so nothing gets mixed up at rush hour.",
      },
      {
        title: "Kitchen Display (KDS)",
        description: "Tickets move from Queued to Preparing, Ready and Served in real time — no shouting across the pass, no lost paper slips.",
      },
      {
        title: "Recipe-based stock",
        description: "Selling a dish deducts its ingredients, so you always know what's left in the store room.",
      },
    ],
    workflowIntro: "From the first order to the last receipt, the whole service runs on one screen.",
    workflow: [
      { title: "01. Take the order", description: "Choose dine-in, takeaway or delivery, pick the table and add dishes with modifiers." },
      { title: "02. Kitchen prepares", description: "The KOT goes straight to the kitchen display and chefs update its status as they cook." },
      { title: "03. Bill & close", description: "Split the bill, take cash, card or wallet, and print or WhatsApp the receipt." },
    ],
    faqs: [
      { question: "Can one order be split between guests?", answer: "Yes. Payments can be split across cash, card and wallet on the same bill." },
      { question: "Does the kitchen need its own screen?", answer: "Any browser screen in the kitchen can run the Kitchen Display; tickets arrive the moment an order is placed." },
      commonFaqs.offline,
    ],
  },
  {
    slug: "cafe",
    number: "[02]",
    name: "Cafe & Coffee Shop",
    cardText: "Quick-serve counter billing with modifiers, combos and barista tickets.",
    lead: "Counter service at coffee speed,",
    highlight: "with every shot, syrup and combo accounted for.",
    tagsLeft: ["Quick serve", "Modifiers", "Combos"],
    tagsRight: ["KOT", "Recipe deduction", "Loyalty"],
    overview:
      "Built for the queue: a fast counter screen with modifiers and combos, tickets for the barista and ingredient-level stock for beans, milk and syrups.",
    specs: [
      { title: "Service style", value: "Counter / quick serve" },
      { title: "Menu", value: "Modifiers, sizes and combos" },
      { title: "Kitchen", value: "Barista tickets (KOT)" },
      { title: "Stock", value: "Recipe-based ingredient deduction" },
    ],
    valueProp: "Shorter queues, consistent orders and ingredient costs you can actually see.",
    benefits: [
      { title: "Fast counter screen", description: "Big touch-friendly product grid, category filter and search keep the line moving." },
      { title: "Modifiers & combos", description: "Sizes, extra shots and meal deals are priced correctly every time." },
      { title: "Ingredient tracking", description: "Every cup deducts beans, milk and syrups so reorders never catch you out." },
    ],
    workflowIntro: "A cafe day in three steps — no training manual needed.",
    workflow: [
      { title: "01. Ring it up", description: "Tap the drink, pick size and extras, add a snack." },
      { title: "02. Barista ticket", description: "The order prints or appears on the prep screen instantly." },
      { title: "03. Pay & go", description: "Cash, card or wallet, receipt printed or sent on WhatsApp." },
    ],
    faqs: [commonFaqs.hardware, commonFaqs.offline],
  },
  {
    slug: "bakery",
    number: "[03]",
    name: "Bakery & Confectionery",
    cardText: "Fresh batches, expiry control, weight pricing and custom cake orders.",
    lead: "Sell what's fresh first,",
    highlight: "price by weight and never miss a cake order.",
    tagsLeft: ["Fresh batches", "Expiry control", "Weight pricing"],
    tagsRight: ["Custom cakes", "Quick serve", "Recipe deduction"],
    overview:
      "Every batch is tracked with its bake date and expiry, items can be sold by weight, and FEFO makes sure the oldest stock leaves the shelf first.",
    specs: [
      { title: "Stock control", value: "Batch & expiry tracking (FEFO)" },
      { title: "Pricing", value: "Per item or by weight" },
      { title: "Orders", value: "Custom cake bookings" },
      { title: "Receipts", value: "Bakery token & thermal receipt" },
    ],
    valueProp: "Less waste, correct weight-based prices and a counter that knows what is fresh.",
    benefits: [
      { title: "FEFO batches", description: "First-expiry-first-out selling, with expired batches blocked at the till." },
      { title: "Weight pricing", description: "Sell cakes, sweets and biscuits by the gram with accurate totals." },
      { title: "Custom orders", description: "Record cake orders with details and deliver them on time." },
    ],
    workflowIntro: "From the oven to the counter, every batch is accounted for.",
    workflow: [
      { title: "01. Add the batch", description: "Record bake date, expiry and quantity for each fresh batch." },
      { title: "02. Sell fresh first", description: "The till picks the batch that expires soonest automatically." },
      { title: "03. Review waste", description: "Reports show what sold, what's left and what's about to expire." },
    ],
    faqs: [commonFaqs.offline, commonFaqs.fbr],
  },
  {
    slug: "pharmacy",
    number: "[04]",
    name: "Pharmacy & Medical Store",
    cardText: "Batch and expiry tracking, FEFO selling, generic names and prescriptions.",
    lead: "Every strip and bottle tracked by batch and expiry,",
    highlight: "so expired medicine never reaches a patient.",
    tagsLeft: ["Batch tracking", "Expiry alerts", "FEFO"],
    tagsRight: ["Generic names", "Prescriptions", "Barcode"],
    overview:
      "A pharmacy POS that knows every batch: search by brand or generic name, scan the barcode, and the system sells the nearest-expiry stock while blocking anything expired.",
    specs: [
      { title: "Stock", value: "Batch, expiry & FEFO" },
      { title: "Search", value: "Brand, generic name or barcode" },
      { title: "Tax", value: "Store-specific tax rate" },
      { title: "Compliance", value: "Audit log for every adjustment" },
    ],
    valueProp: "Safer dispensing, less expired stock written off and a full audit trail for every change.",
    benefits: [
      { title: "Expiry protection", description: "Expired batches are blocked at checkout and near-expiry items sell first." },
      { title: "Generic search", description: "Find alternatives quickly by generic name when a brand is out of stock." },
      { title: "Stock you can trust", description: "Adjustments can never push stock below zero and every change is logged." },
    ],
    workflowIntro: "Built for the busy counter where accuracy matters most.",
    workflow: [
      { title: "01. Receive stock", description: "Add medicines with batch number, expiry and cost price." },
      { title: "02. Dispense", description: "Scan or search, and the correct batch is selected automatically." },
      { title: "03. Reorder", description: "Stock and expiry reports tell you what to reorder and what to return." },
    ],
    faqs: [
      { question: "Can I search by generic name?", answer: "Yes. Products carry both brand and generic names, and search works on either." },
      commonFaqs.fbr,
      commonFaqs.offline,
    ],
  },
  {
    slug: "retail",
    number: "[05]",
    name: "Retail Store",
    cardText: "Barcode billing, product variants, bulk discounts and loyalty.",
    lead: "Scan, sell and restock",
    highlight: "across every branch from one dashboard.",
    tagsLeft: ["Barcode", "Variants", "Bulk discounts"],
    tagsRight: ["Loyalty", "Branches", "Stock transfers"],
    overview:
      "Barcode-first billing for shops of any size, with branch-wise stock, transfers between branches and reports that show real profit — not just sales.",
    specs: [
      { title: "Billing", value: "Hardware & camera barcode scanning" },
      { title: "Inventory", value: "Branch-wise stock & transfers" },
      { title: "Labels", value: "Barcode label printing" },
      { title: "Reports", value: "Revenue, refunds & gross profit" },
    ],
    valueProp: "Faster checkout, accurate stock in every branch and profit numbers you can plan with.",
    benefits: [
      { title: "Barcode everything", description: "Print labels, scan with a USB scanner or the camera, and bill in one beep." },
      { title: "Multi-branch stock", description: "Send stock between branches and receive it with full batch history." },
      { title: "Controlled discounts", description: "Big discounts need a manager PIN, so margins stay protected." },
    ],
    workflowIntro: "Run the shop floor and the back office from the same system.",
    workflow: [
      { title: "01. Label & stock", description: "Add products, print barcode labels and set opening stock." },
      { title: "02. Scan & sell", description: "Scan, apply discounts, take split payments and print receipts." },
      { title: "03. Analyse", description: "See net revenue, gross profit and month-on-month growth." },
    ],
    faqs: [commonFaqs.hardware, commonFaqs.fbr],
  },
  {
    slug: "supermarket",
    number: "[06]",
    name: "Supermarket & Mart",
    cardText: "High-volume barcode checkout, weighed items, batches and bulk pricing.",
    lead: "High-volume checkout for thousands of items,",
    highlight: "from loose rice by the kilo to packed goods by barcode.",
    tagsLeft: ["Barcode", "Weight pricing", "Batch tracking"],
    tagsRight: ["Bulk discounts", "Multi-counter", "Shift reports"],
    overview:
      "Multiple counters, thousands of SKUs and weighed items — each cashier runs a shift with opening float and closing variance, while stock updates live.",
    specs: [
      { title: "Counters", value: "Multi-counter shifts & EOD" },
      { title: "Items", value: "Barcode & weight-based" },
      { title: "Stock", value: "Batches & expiry" },
      { title: "Security", value: "Role-based access & audit log" },
    ],
    valueProp: "Short queues on busy days and cash that reconciles at every shift close.",
    benefits: [
      { title: "Shift control", description: "Opening float, cash sales, refunds and closing variance for every counter." },
      { title: "Weighed goods", description: "Sell produce and loose items by weight with correct pricing." },
      { title: "Refund approvals", description: "Cashiers request refunds; managers approve — never the same person." },
    ],
    workflowIntro: "Designed for the Saturday rush.",
    workflow: [
      { title: "01. Open the counter", description: "Cashier logs in with Store Code + PIN and records the opening float." },
      { title: "02. Checkout fast", description: "Scan barcodes, weigh loose items and take any payment method." },
      { title: "03. Close the shift", description: "End-of-day shows expected vs counted cash for every counter." },
    ],
    faqs: [commonFaqs.offline, commonFaqs.hardware],
  },
  {
    slug: "electronics",
    number: "[07]",
    name: "Electronics & Mobile",
    cardText: "Serial and IMEI tracking, warranty records and installments.",
    lead: "Track every device by serial and IMEI,",
    highlight: "with warranty details printed on the receipt.",
    tagsLeft: ["Serial numbers", "IMEI", "Warranty"],
    tagsRight: ["Installments", "Barcode", "Branches"],
    overview:
      "High-value stock needs individual tracking. Record serial or IMEI numbers and warranty terms on every sale, so after-sales claims are easy to verify.",
    specs: [
      { title: "Tracking", value: "Serial number & IMEI" },
      { title: "After-sales", value: "Warranty period per product" },
      { title: "Payments", value: "Cash, card, wallet & split" },
      { title: "Security", value: "Manager approval on big discounts" },
    ],
    valueProp: "Every high-value item accounted for, and warranty claims answered in seconds.",
    benefits: [
      { title: "Per-unit tracking", description: "Know exactly which serial or IMEI was sold, when and to whom." },
      { title: "Warranty on record", description: "Warranty terms are stored with the product and shown on the receipt." },
      { title: "Protected margins", description: "Discounts above the limit require a manager PIN." },
    ],
    workflowIntro: "From the stockroom to the warranty claim.",
    workflow: [
      { title: "01. Receive devices", description: "Record serial/IMEI and warranty for each unit." },
      { title: "02. Sell", description: "Scan the device, confirm the serial and take payment." },
      { title: "03. Support", description: "Look up the sale by serial when a customer returns." },
    ],
    faqs: [commonFaqs.fbr, commonFaqs.hardware],
  },
  {
    slug: "clothing",
    number: "[08]",
    name: "Clothing & Fashion",
    cardText: "Size and colour variants, seasonal collections and gift cards.",
    lead: "Every size and colour in one place,",
    highlight: "so the right stock reaches the right branch.",
    tagsLeft: ["Size & colour", "Variants", "Season tags"],
    tagsRight: ["Gift cards", "Barcode labels", "Transfers"],
    overview:
      "Manage collections as variants of size and colour, label them with barcodes and move stock between branches as each season sells through.",
    specs: [
      { title: "Products", value: "Size × colour variants" },
      { title: "Collections", value: "Season tagging" },
      { title: "Labels", value: "Barcode label printing" },
      { title: "Inventory", value: "Branch-to-branch transfers" },
    ],
    valueProp: "Fewer lost sales from missing sizes and clear sell-through for every collection.",
    benefits: [
      { title: "Variant matrix", description: "One product, many sizes and colours — each with its own stock." },
      { title: "Season control", description: "Tag products by season to plan sales and clearance." },
      { title: "Branch transfers", description: "Move sizes where they sell best with full tracking." },
    ],
    workflowIntro: "From new arrivals to end-of-season sale.",
    workflow: [
      { title: "01. Add the collection", description: "Create products with sizes, colours and season tags." },
      { title: "02. Label & sell", description: "Print barcode labels and bill with a scan." },
      { title: "03. Rebalance", description: "Transfer slow sizes to the branches that need them." },
    ],
    faqs: [commonFaqs.hardware, commonFaqs.offline],
  },
  {
    slug: "salon",
    number: "[09]",
    name: "Salon & Spa",
    cardText: "Services, packages, memberships and staff commission.",
    lead: "Bill services and products together,",
    highlight: "and see what every stylist earns.",
    tagsLeft: ["Appointments", "Packages", "Memberships"],
    tagsRight: ["Staff commission", "Attendance", "Payroll"],
    overview:
      "Services, retail products and packages on one bill, with staff attendance and payroll built in so commission and salaries are always accurate.",
    specs: [
      { title: "Billing", value: "Services & retail products" },
      { title: "Loyalty", value: "Packages & memberships" },
      { title: "Staff", value: "PIN attendance & monthly payroll" },
      { title: "Reports", value: "Sales & staff performance" },
    ],
    valueProp: "A calmer front desk, loyal repeat clients and fair, transparent staff pay.",
    benefits: [
      { title: "Services + products", description: "Haircut, treatment and the shampoo you sold — all on one receipt." },
      { title: "Staff attendance", description: "Staff clock in and out with their PIN at the counter." },
      { title: "Payroll in the ledger", description: "Salaries paid through RST POS post straight to your accounts." },
    ],
    workflowIntro: "The whole salon day, simplified.",
    workflow: [
      { title: "01. Check in", description: "Staff clock in with their PIN at the start of the day." },
      { title: "02. Serve & bill", description: "Add services and products and take payment." },
      { title: "03. Pay the team", description: "Monthly payroll uses each staff member's salary profile." },
    ],
    faqs: [commonFaqs.offline, commonFaqs.fbr],
  },
  {
    slug: "hospital",
    number: "[10]",
    name: "Hospital & Clinic",
    cardText: "Doctor directory, consultation billing, patient tokens and doctor-wise revenue.",
    lead: "Consultation billing with patient tokens,",
    highlight: "and doctor shares calculated automatically.",
    tagsLeft: ["Doctor directory", "Consultation billing", "Patient tokens"],
    tagsRight: ["Doctor share", "Doctor reports", "Ledger"],
    overview:
      "Register doctors with their fees and commission arrangement, issue a numbered patient token (perchi) at reception, and let the ledger split revenue between hospital and doctor.",
    specs: [
      { title: "Reception", value: "Consultation billing & tokens" },
      { title: "Doctors", value: "Fees, commission & arrangement" },
      { title: "Accounting", value: "Hospital share & doctor payable" },
      { title: "Reports", value: "Doctor-wise revenue" },
    ],
    valueProp: "A faster reception desk and doctor payouts that are always correct and auditable.",
    benefits: [
      { title: "Patient tokens", description: "Every consultation gets a numbered token and printed receipt." },
      { title: "Automatic doctor share", description: "Each bill posts hospital revenue and doctor payable to the ledger." },
      { title: "Doctor reports", description: "See consultations and earnings per doctor for any period." },
    ],
    workflowIntro: "From reception to doctor settlement.",
    workflow: [
      { title: "01. Set up doctors", description: "Add each doctor's fee and commission arrangement." },
      { title: "02. Bill the visit", description: "Reception issues the token and collects the fee." },
      { title: "03. Settle", description: "Doctor-wise reports show exactly what each doctor is owed." },
    ],
    faqs: [
      { question: "Is the doctor's share calculated automatically?", answer: "Yes. Each consultation posts the hospital share as revenue and the doctor share as a payable in the ledger." },
      commonFaqs.hardware,
    ],
  },
];

export function getIndustry(slug: string) {
  return industries.find((i) => i.slug === slug) ?? null;
}
