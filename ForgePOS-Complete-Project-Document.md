# ForgePOS
## Universal Point of Sale Platform — Complete Technical & Project Document

**Prepared for:** Product Owner
**Stack:** Next.js (App Router) + MongoDB + TypeScript
**Document Type:** Full Technical Specification, Architecture & Delivery Roadmap
**Version:** 2.0 — Professional Edition
**Date:** September 2026

---

## Table of Contents

1. Executive Summary
2. Product Goals & Success Metrics
3. Business Type Engine (Core Differentiator)
4. Complete Technology Stack
5. System Architecture
6. Database Design (Full Schema)
7. API Design
8. Security Architecture
9. Module-by-Module Specification
10. Industry Vertical Configurations
11. DevOps, Infrastructure & Deployment
12. Testing Strategy
13. Full Delivery Roadmap (Phase-by-Phase)
14. Team Structure & Effort Estimate
15. Risk Register
16. Future Enhancements (Post-Launch)

---

## 1. Executive Summary

ForgePOS ek **single-codebase, multi-tenant, multi-vertical POS platform** hai jo restaurant, pharmacy, retail, salon, supermarket, electronics, aur clothing — sab businesses ko ek hi system se serve karta hai. Onboarding ke waqt business apna **industry type** select karta hai, aur system khud-ba-khud relevant modules, terminology, aur workflows activate kar deta hai.

Ye document poore project ka **single source of truth** hai — architecture, database, security, roadmap, aur team planning sab isme cover hai.

---

## 2. Product Goals & Success Metrics

| Goal | Metric |
|---|---|
| Ek hi platform har business type serve kare | 8+ verticals supported at launch |
| Fast checkout | < 3 second average transaction time |
| Reliable in low-connectivity areas | Offline mode with 100% sync accuracy |
| Owner ko real-time visibility mile | Live dashboard, < 5 sec data lag |
| Multi-branch scalability | Support 500+ branches per organization without performance drop |
| Data integrity | Zero tolerance — double-entry accounting must always balance |

---

## 3. Business Type Engine (Core Differentiator)

Yehi system ka dil hai. Ek Organization setup ke waqt `businessType` choose karti hai, aur har feature ek **capability flag** ke peeche chhupa hota hai.

```ts
interface OrganizationConfig {
  businessType: "restaurant" | "cafe" | "pharmacy" | "retail" |
                 "supermarket" | "electronics" | "clothing" |
                 "salon" | "food_chain";
  enabledModules: string[];       // e.g. ["kot", "batch_tracking", "appointments"]
  terminology: Record<string,string>; // e.g. { "order": "Prescription" }
  requiredFields: Record<string,string[]>; // e.g. product: ["expiryDate"]
}
```

**Design pattern:** Strategy + Feature-Flag pattern. Ek `VerticalConfigProvider` context frontend aur backend dono mein inject hota hai. UI components conditionally render hote hain (`<FeatureGate module="kot">`), aur Mongoose schemas conditional validation lagate hain based on `businessType`.

Naya vertical add karna = sirf ek naya config object likhna, core engine ko touch nahi karna parta. Ye maintainability aur future-proofing ka sabse bara guarantee hai.

---

## 4. Complete Technology Stack

### Frontend
| Component | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Server Components + Server Actions) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + shadcn/ui |
| State Management | Zustand (cart/session), TanStack Query (server-state cache) |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| PWA / Offline | Workbox (service worker) + IndexedDB (Dexie.js) |
| Realtime Client | Socket.io-client |

### Backend
| Component | Technology |
|---|---|
| Runtime | Node.js (via Next.js API routes / Server Actions) |
| Database | MongoDB Atlas (Replica Set, M10+ for production) |
| ODM | Mongoose |
| Auth | NextAuth.js (Auth.js) + custom PIN-based cashier auth |
| Realtime Server | Socket.io (or Ably for managed scale) |
| Caching / Queue | Redis (Upstash) |
| Background Jobs | BullMQ (low-stock alerts, EOD batch jobs, payroll runs) |
| File Storage | Cloudflare R2 / AWS S3 (receipts, product images, prescriptions) |
| Validation | Zod (shared schema between client & server) |

### Integrations
| Purpose | Provider |
|---|---|
| Card Payments | Stripe |
| Local Wallets (PK) | JazzCash, Easypaisa API |
| SMS/WhatsApp | WhatsApp Business Cloud API / Twilio |
| Email | Resend |
| PDF Generation | React-PDF / Puppeteer |
| Barcode/QR | react-barcode, ZXing (scanner) |
| Thermal Printing | node-thermal-printer / WebUSB ESC-POS |

### DevOps
| Component | Technology |
|---|---|
| Hosting (App) | Vercel (or self-hosted via Docker + Kubernetes for enterprise) |
| Hosting (DB) | MongoDB Atlas |
| CI/CD | GitHub Actions |
| Monitoring | Sentry (errors) + Better Stack (uptime/logs) |
| Analytics | PostHog (self-hostable) |
| Secrets Management | Vercel Env / Doppler |

---

## 5. System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                          │
│  Web POS (Cashier) | Admin Dashboard | KDS | Customer Display │
│  Progressive Web App — installable, offline-capable            │
└───────────────────────────┬────────────────────────────────┘
                             │ HTTPS / WSS
┌───────────────────────────▼────────────────────────────────┐
│                   NEXT.JS APPLICATION LAYER                   │
│  Server Actions | API Routes | Middleware (tenant isolation)  │
│  Auth (NextAuth) | Rate Limiting | Request Validation (Zod)   │
└─────────┬─────────────────┬─────────────────┬───────────────┘
          │                 │                 │
   ┌──────▼──────┐  ┌───────▼───────┐ ┌───────▼────────┐
   │ Business     │  │ Realtime       │ │ Background      │
   │ Logic Layer  │  │ Layer          │ │ Job Queue        │
   │ (services/)  │  │ (Socket.io)    │ │ (BullMQ + Redis) │
   └──────┬───────┘  └────────────────┘ └───────┬──────────┘
          │                                       │
   ┌──────▼───────────────────────────────────────▼──────┐
   │                   MongoDB Atlas                       │
   │     Multi-tenant, org+branch scoped collections         │
   └────────────────────────────────────────────────────────┘
```

**Tenant isolation:** Har query automatically ek Mongoose middleware plugin se `organizationId` filter leta hai — developer ko manually har jagah likhna nahi parta, isse data-leak risk kam hota hai.

**Offline flow:** Cashier screen PWA hai → transaction pehle IndexedDB mein likha jata hai → agar online hai to turant server ko bheja jata hai → agar offline hai to queue mein rehta hai → connection wapas aane par background sync service queued transactions ko server pe push karta hai, conflict hone par manual-review flag lagti hai.

---

## 6. Database Design (Full Schema Overview)

```
organizations
branches
users                    (staff + admins)
roles                    (RBAC definitions)
products
product_variants
categories
inventory_stock          (per branch)
stock_movements          (audit trail)
batches                  (expiry/batch — pharmacy, supermarket)
suppliers
purchase_orders
orders
order_items
tables                   (restaurant)
kot_tickets
appointments             (salon)
counters                 (cashier shift sessions)
counter_sessions_log
customers
loyalty_transactions
accounts_chart
journal_entries
ledger_balances
payments
refunds
attendance
payroll_runs
notifications
audit_logs
subscriptions             (if SaaS billing enabled)
```

### Sample: Order Schema (core transaction document)
```ts
const OrderSchema = new Schema({
  organizationId: { type: ObjectId, index: true, required: true },
  branchId: { type: ObjectId, index: true, required: true },
  orderNumber: String,
  type: { type: String, enum: ["dine_in","takeaway","delivery","retail_sale","prescription"] },
  tableId: ObjectId,               // restaurant only
  customerId: ObjectId,
  cashierId: ObjectId,
  items: [{
    productId: ObjectId,
    variantId: ObjectId,
    quantity: Number,
    unitPrice: Number,
    discount: Number,
    batchId: ObjectId,             // pharmacy/supermarket
    modifiers: [{ name: String, priceDelta: Number }],
  }],
  subtotal: Number,
  taxTotal: Number,
  discountTotal: Number,
  grandTotal: Number,
  payments: [{ method: String, amount: Number, reference: String }],
  status: { type: String, enum: ["open","held","completed","voided","refunded"] },
  syncedOffline: Boolean,
  createdAt: Date,
}, { timestamps: true });
```

### Indexing Strategy
- Compound index: `{ organizationId: 1, branchId: 1, createdAt: -1 }` on `orders`
- Compound index: `{ organizationId: 1, sku: 1 }` unique on `products`
- TTL index on `audit_logs` (if retention policy needed, e.g. 2 years)
- Text index on `products.name` for search

---

## 7. API Design (High-Level)

RESTful + Server Actions hybrid approach:

```
POST   /api/orders                → create order
PATCH  /api/orders/:id             → update/void order
POST   /api/orders/:id/payments    → record payment
GET    /api/inventory/stock        → real-time stock levels
POST   /api/inventory/transfer     → inter-branch transfer
GET    /api/reports/sales-summary  → date-range filtered
POST   /api/counters/open          → open cashier shift
POST   /api/counters/:id/close     → EOD close
POST   /api/accounting/journal     → manual journal entry
GET    /api/products?businessType= → vertical-filtered catalogue
POST   /webhooks/whatsapp          → incoming notification status
```

Public API + webhooks bhi exposed honge (Phase 4) taake clients apne accounting ya e-commerce tools se integrate kar sakein.

---

## 8. Security Architecture

- **Authentication:** Admin/manager = email + password + mandatory 2FA. Cashier = 4-digit PIN quick-switch on shared terminal, tied to device + branch.
- **Authorization:** Fine-grained RBAC — permission checks at API layer AND UI layer.
- **Tenant Isolation:** Enforced at Mongoose middleware level, tested via automated cross-tenant query audit in CI.
- **Data Encryption:** TLS in transit, field-level encryption for CNIC/payment data at rest.
- **Audit Logging:** Every mutating action logged with actor, timestamp, before/after diff — immutable collection.
- **Rate Limiting:** Per-IP and per-user on auth and payment endpoints.
- **Compliance:** GDPR-style data export/delete for customers; DRAP-style controlled-substance reporting for pharmacies.

---

## 9. Module-by-Module Specification

| # | Module | Key Capabilities |
|---|---|---|
| 1 | POS Billing | Table orders, KOT, split payment, discounts, void, offline mode, quick-serve |
| 2 | Inventory | Real-time stock, alerts, purchases, adjustments, recipe deduction, transfers, batch/FIFO |
| 3 | Employee Mgmt | RBAC, attendance, payroll, custom roles, branch assignment, performance |
| 4 | Reports & Analytics | Sales, category/staff performance, discount analysis, PDF/CSV export |
| 5 | Accounting | Double-entry ledger, chart of accounts, trial balance, P&L, cash book, reconciliation |
| 6 | Multi-Branch | Unlimited branches, isolation, admin switch-view, consolidated reporting |
| 7 | Counter & EOD | Opening float, denomination tracking, disbursements, closing report, force-close |
| 8 | Billing & Refunds | Auto invoicing, manager-approved refunds, audit trail |
| 9 | Loyalty | Points earn/redeem, customer profile visibility |
| 10 | Variants | Size/colour/weight, own SKU/price/stock/barcode |
| 11 | Barcode & Serial | USB/BT scanning, serial/IMEI, weight-based pricing |
| 12 | Appointments | Booking calendar, staff assignment, commission (salon) |
| 13 | Notifications | WhatsApp/SMS/email — order ready, receipt, low stock, payroll |

---

## 10. Industry Vertical Configurations

| Vertical | Special Modules Activated |
|---|---|
| Restaurant / Food Chain | Table management, KOT, KDS, recipe deduction, split/merge bill |
| Cafe / Bakery | Quick-serve, combos/modifiers, recipe deduction, expiry on perishables |
| Retail / Supermarket | Barcode, variants, weight-based pricing, bulk discounts, low-stock alerts |
| Pharmacy | Batch/expiry, near-expiry alerts, FIFO, controlled-substance reports, generic mapping |
| Electronics | Serial/IMEI, warranty, repair tickets, trade-in/instalment |
| Clothing/Fashion | Size-colour matrix, catalogue images, season tagging, exchange/gift cards |
| Salon/Spa | Appointment booking, commission tracking, packages/memberships |

---

## 11. DevOps, Infrastructure & Deployment

- **Environments:** Local (Docker Compose) → Staging (Vercel Preview + Atlas Dev cluster) → Production (Vercel Prod + Atlas M10+ dedicated cluster)
- **CI/CD:** GitHub Actions — lint, type-check, unit tests, e2e tests (Playwright) on every PR; auto-deploy staging on merge to `develop`, manual promote to `main`
- **Backups:** MongoDB Atlas continuous backup + daily encrypted snapshot to S3, tested restore quarterly
- **Monitoring:** Sentry for error tracking, Better Stack for uptime + structured logs, PostHog for product analytics
- **Scaling:** Vercel auto-scales app layer; MongoDB sharding by `organizationId` planned once org count > threshold (~5,000 orgs or hot-shard detected)

---

## 12. Testing Strategy

| Layer | Tool | Coverage Target |
|---|---|---|
| Unit Tests | Vitest | Business logic, calculations (tax, discounts, ledger posting) — 80%+ |
| Integration Tests | Vitest + MongoDB Memory Server | API routes, DB operations |
| E2E Tests | Playwright | Critical flows: checkout, refund, EOD close, stock transfer |
| Load Testing | k6 | Peak checkout concurrency per branch |
| Accounting Integrity Test | Custom script | Verify debit = credit on every journal entry, run in CI |

---

## 13. Full Delivery Roadmap (Phase-by-Phase)

### Phase 0 — Foundation (2–3 weeks)
- Repo setup (Turborepo), CI/CD pipeline, design system (Tailwind + shadcn theme)
- Auth system (NextAuth + PIN login)
- Business Type Engine skeleton + multi-tenant middleware
- Core DB models: organizations, branches, users, roles

### Phase 1 — MVP (6–8 weeks)
- POS billing screen (single branch, retail + restaurant vertical)
- Basic inventory (stock in/out, low-stock alert)
- Basic reports (daily sales summary)
- Receipt printing, cash/card payment
- **Deliverable:** Usable single-branch POS for retail or restaurant

### Phase 2 — Core Business Features (6–8 weeks)
- Multi-branch support + consolidated reporting
- Full accounting module (ledger, trial balance, P&L)
- Counter & EOD workflow
- Employee management + payroll + attendance
- Pharmacy vertical (batch/expiry) + Salon vertical (appointments)

### Phase 3 — Advanced Retail Features (5–6 weeks)
- Offline-first PWA (IndexedDB + background sync)
- Product variants, barcode & serial tracking
- Customer loyalty program
- Electronics + Clothing verticals
- Supplier purchase orders + inter-branch transfer

### Phase 4 — Scale & Intelligence (6+ weeks, post-launch)
- WhatsApp/SMS notifications
- AI-based reorder suggestions & demand forecasting
- Self-checkout kiosk mode, customer-facing display
- Public API + webhooks, white-labeling
- SaaS subscription billing (if selling ForgePOS itself)

**Total estimated time to full-featured product: ~6–7 months** (with a focused 4–6 person team). MVP achievable in **8–10 weeks**.

---

## 14. Team Structure & Effort Estimate

| Role | Count | Focus |
|---|---|---|
| Full-stack Engineer (Next.js/MongoDB) | 2–3 | Core app, modules |
| Frontend/UI Engineer | 1 | POS UX, KDS, dashboards |
| Backend/DevOps Engineer | 1 | Infra, integrations, scaling |
| QA Engineer | 1 (part-time initially) | Test automation, especially accounting integrity |
| Product/Design | 1 | Vertical workflows, UX research per industry |

---

## 15. Risk Register

| Risk | Mitigation |
|---|---|
| Feature-flag sprawl becomes unmanageable | Strict "vertical-config" package, code review gate on any hardcoded business-type check |
| Offline sync conflicts corrupt data | Conflict queue + manual review, never silent overwrite |
| Accounting ledger goes out of balance | Automated CI test enforcing debit=credit on every entry |
| Multi-tenant data leak | Middleware-enforced org filter + automated cross-tenant audit tests |
| Scope creep across 9 verticals | Ship MVP with 2 verticals, expand incrementally per roadmap |

---

## 16. Future Enhancements (Post-Launch)

- Native mobile apps (React Native) for owner dashboard on the go
- E-commerce/online ordering sync
- Franchise royalty & multi-owner revenue-sharing module
- Predictive staffing (schedule suggestions based on historical footfall)
- Voice-command order entry for restaurants

---

*End of Document — ForgePOS Complete Technical & Project Specification v2.0*
