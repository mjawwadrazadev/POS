export type BusinessType =
  | "restaurant"
  | "cafe"
  | "bakery"
  | "pharmacy"
  | "retail"
  | "supermarket"
  | "electronics"
  | "clothing"
  | "salon"
  | "hospital";

export interface VerticalConfig {
  businessType: BusinessType;
  title: string;
  enabledModules: string[];
  terminology: Record<string, string>;
  requiredFields: Record<string, string[]>;
}

export const VERTICAL_CONFIGS: Record<BusinessType, VerticalConfig> = {
  restaurant: {
    businessType: "restaurant",
    title: "Restaurant / Fine Dining",
    enabledModules: ["kot", "kds", "tables", "recipe_deduction", "split_bill"],
    terminology: {
      order: "Table Order",
      item: "Dish / Menu Item",
      customer: "Guest",
      staff: "Waitstaff / Chef",
    },
    requiredFields: {
      product: ["preparationTime", "category"],
    },
  },
  cafe: {
    businessType: "cafe",
    title: "Cafe & Coffee Shop",
    enabledModules: ["kot", "quick_serve", "combos", "recipe_deduction"],
    terminology: {
      order: "Counter Order",
      item: "Beverage / Snack",
      customer: "Customer",
      staff: "Barista",
    },
    requiredFields: {
      product: ["modifiers"],
    },
  },
  bakery: {
    businessType: "bakery",
    title: "Bakery & Confectionery",
    enabledModules: ["fresh_batch", "perishable_expiry", "custom_cakes", "weight_pricing", "recipe_deduction", "quick_serve"],
    terminology: {
      order: "Bakery Token",
      item: "Confectionery / Cake",
      customer: "Customer",
      staff: "Baker / Cashier",
    },
    requiredFields: {
      product: ["bakedDate", "expiryTime", "weightGrams"],
    },
  },
  retail: {
    businessType: "retail",
    title: "Retail Store",
    enabledModules: ["barcode", "variants", "bulk_discounts", "loyalty"],
    terminology: {
      order: "Retail Sale",
      item: "Product",
      customer: "Customer",
      staff: "Sales Associate",
    },
    requiredFields: {
      product: ["sku", "barcode"],
    },
  },
  pharmacy: {
    businessType: "pharmacy",
    title: "Pharmacy & Medical",
    enabledModules: ["batch_tracking", "expiry_alert", "fifo", "prescriptions"],
    terminology: {
      order: "Prescription Sale",
      item: "Medicine / Drug",
      customer: "Patient",
      staff: "Pharmacist",
    },
    requiredFields: {
      product: ["sku", "batchNumber", "expiryDate", "genericName"],
    },
  },
  supermarket: {
    businessType: "supermarket",
    title: "Supermarket & Mart",
    enabledModules: ["barcode", "weight_pricing", "batch_tracking", "bulk_discounts"],
    terminology: {
      order: "Checkout Bill",
      item: "Grocery Item",
      customer: "Shopper",
      staff: "Cashier",
    },
    requiredFields: {
      product: ["sku", "barcode", "unitOfMeasure"],
    },
  },
  electronics: {
    businessType: "electronics",
    title: "Electronics & Mobile",
    enabledModules: ["serial_tracking", "imei", "warranty", "installments"],
    terminology: {
      order: "Device Sale",
      item: "Gadget / Accessory",
      customer: "Buyer",
      staff: "Sales Rep",
    },
    requiredFields: {
      product: ["sku", "serialNumber", "warrantyMonths"],
    },
  },
  clothing: {
    businessType: "clothing",
    title: "Clothing & Fashion",
    enabledModules: ["variants_matrix", "size_color", "gift_cards", "season_tag"],
    terminology: {
      order: "Apparel Sale",
      item: "Garment / Style",
      customer: "Shopper",
      staff: "Fashion Consultant",
    },
    requiredFields: {
      product: ["sku", "size", "color"],
    },
  },
  salon: {
    businessType: "salon",
    title: "Salon & Spa",
    enabledModules: ["appointments", "staff_commission", "packages", "memberships"],
    terminology: {
      order: "Service Ticket",
      item: "Service / Treatment",
      customer: "Client",
      staff: "Stylist / Specialist",
    },
    requiredFields: {
      product: ["durationMinutes"],
    },
  },
  hospital: {
    businessType: "hospital",
    title: "Hospital & Medical Center",
    enabledModules: ["doctor_management", "consultation_billing", "doctor_wise_reports"],
    terminology: {
      order: "Consultation Bill",
      item: "Doctor / Consultation",
      customer: "Patient",
      staff: "Receptionist / Medical Staff",
    },
    requiredFields: {
      doctor: ["name", "fees"],
    },
  },
};


export function getVerticalConfig(type: BusinessType): VerticalConfig {
  return VERTICAL_CONFIGS[type] || VERTICAL_CONFIGS.bakery;
}
