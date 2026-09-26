import { BusinessType } from "@/lib/config/verticals";

// Optional starter catalogue created when a tenant is provisioned with "create sample menu".
// Stock starts at 0 so no inventory exists until the store records real stock.
export const TENANT_TEMPLATE_ITEMS: Record<BusinessType, Record<string, any>[]> = {
  bakery: [
    { name: "Cream Fudge Cake (2 Pound)", sku: "BAK-101", category: "Cakes", price: 2400, costPrice: 1400, stock: 0, unit: "Pcs", weightGrams: 900, expiryTime: "48 Hours", isPerishable: true },
    { name: "Butter Croissant", sku: "BAK-102", category: "Pastries & Breads", price: 300, costPrice: 160, stock: 0, unit: "Pcs", expiryTime: "24 Hours", isPerishable: true },
    { name: "Garlic Toast Slices", sku: "BAK-103", category: "Breads", price: 350, costPrice: 180, stock: 0, unit: "Pack", expiryTime: "3 Days" },
  ],
  restaurant: [
    { name: "Chicken Karahi (1KG)", sku: "FD-101", category: "Main Course", price: 1950, costPrice: 1250, stock: 0, unit: "KG", preparationTime: 25 },
    { name: "Beef Seekh Kabab (6 Pcs)", sku: "FD-102", category: "Appetizers", price: 1200, costPrice: 750, stock: 0, unit: "Plate", preparationTime: 20 },
    { name: "Mint Lemonade", sku: "BV-101", category: "Beverages", price: 350, costPrice: 150, stock: 0, unit: "Glass", preparationTime: 5 },
  ],
  cafe: [
    { name: "Double Shot Espresso", sku: "CAF-101", category: "Hot Drinks", price: 450, costPrice: 180, stock: 0, unit: "Cup", preparationTime: 5 },
    { name: "Spanish Latte (Iced)", sku: "CAF-102", category: "Cold Drinks", price: 680, costPrice: 320, stock: 0, unit: "Cup", preparationTime: 5 },
    { name: "Club Sandwich with Fries", sku: "CAF-103", category: "Snacks", price: 850, costPrice: 450, stock: 0, unit: "Plate", preparationTime: 15 },
  ],
  pharmacy: [
    { name: "Paracetamol 500mg (Strip)", sku: "MED-101", category: "Medicines", price: 120, costPrice: 85, stock: 0, unit: "Pcs", genericName: "Paracetamol" },
    { name: "Co-amoxiclav 625mg Tablets", sku: "MED-102", category: "Medicines", price: 550, costPrice: 420, stock: 0, unit: "Box", genericName: "Co-amoxiclav" },
  ],
  retail: [
    { name: "Cotton Casual T-Shirt", sku: "RTL-101", category: "Apparel", price: 1490, costPrice: 850, stock: 0, unit: "Pcs" },
    { name: "Leather Wallet", sku: "RTL-102", category: "Accessories", price: 2200, costPrice: 1200, stock: 0, unit: "Pcs" },
  ],
  supermarket: [
    { name: "Basmati Rice (5KG)", sku: "GR-101", category: "Groceries", price: 2100, costPrice: 1750, stock: 0, unit: "Pack" },
    { name: "Cooking Oil (5 Litre)", sku: "GR-102", category: "Groceries", price: 2850, costPrice: 2450, stock: 0, unit: "Bottle" },
  ],
  electronics: [
    { name: "Type-C Fast Charging Cable (65W)", sku: "ELE-101", category: "Accessories", price: 1250, costPrice: 700, stock: 0, unit: "Pcs", warrantyMonths: 6 },
    { name: "Wireless Earbuds", sku: "ELE-102", category: "Audio", price: 4500, costPrice: 3100, stock: 0, unit: "Pcs", warrantyMonths: 12 },
  ],
  clothing: [
    { name: "Embroidered Kurta", sku: "CLO-101", category: "Men's Wear", price: 3800, costPrice: 2400, stock: 0, unit: "Pcs", size: "L", color: "White" },
    { name: "Linen Dupatta", sku: "CLO-102", category: "Women's Wear", price: 2200, costPrice: 1300, stock: 0, unit: "Pcs", size: "Free Size", color: "Multicolor" },
  ],
  salon: [
    // Services are not stock-limited; a large stock keeps them sellable
    { name: "Haircut & Beard Styling", sku: "SLN-101", category: "Hair Services", price: 1500, costPrice: 400, stock: 999999, unit: "Service" },
    { name: "Deep Cleansing Facial", sku: "SLN-102", category: "Skin Services", price: 3500, costPrice: 1200, stock: 999999, unit: "Service" },
  ],
  hospital: [
    { name: "General OPD Medical Kit", sku: "HOSP-101", category: "Hospital Supplies", price: 500, costPrice: 200, stock: 0, unit: "Kit" },
    { name: "Patient Registration File", sku: "HOSP-102", category: "Stationery", price: 100, costPrice: 30, stock: 0, unit: "File" },
  ],
};

// Placeholder doctor profiles for new hospital tenants — the hospital edits them with real details
export const HOSPITAL_TEMPLATE_DOCTORS = [
  {
    name: "Consultant Physician (edit me)",
    specialization: "General Medicine",
    registrationNumber: "",
    photo: "",
    fees: { newPatient: 2000, followUp: 1000, emergency: 3000 },
    hospitalCommissionPercent: 20,
    paymentArrangement: "revenue_share",
    status: "active",
  },
];
