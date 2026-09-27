"use client";

import {
  CommonGravityContainer,
  CommonGravityObject,
} from "@site/components/animations/CommonGravitySection";

// Falling tags in the home page CTA — POS modules and features
const ITEMS = [
  "POS Billing",
  "Inventory",
  "Barcode",
  "Kitchen Display",
  "KOT",
  "Receipts",
  "Split Payment",
  "Reports",
  "Ledger",
  "FBR Invoicing",
  "Payroll",
  "Branches",
  "Offline Mode",
  "Refunds",
];

export default function CommonGravityPermanentObjects() {
  return (
    <CommonGravityContainer>
      <div className="mxd-promo__objects object-container">
        {ITEMS.map((item, index) => (
          <CommonGravityObject key={item} index={index}>
            <div className="object object-permanent">
              <p>{item}</p>
            </div>
          </CommonGravityObject>
        ))}
      </div>
    </CommonGravityContainer>
  );
}
