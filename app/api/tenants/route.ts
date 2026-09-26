import { NextResponse } from "next/server";
import { normalizeFbrSettings } from "@/lib/fbr/settings";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { User } from "@/models/User";
import { Product } from "@/models/Product";
import { Doctor } from "@/models/Doctor";
import { PaymentHistory } from "@/models/PaymentHistory";
import { BusinessType, VERTICAL_CONFIGS } from "@/lib/config/verticals";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { logAudit } from "@/lib/audit/logger";
import { generateTempPassword, isValidPin } from "@/lib/utils/server";
import { TENANT_TEMPLATE_ITEMS, HOSPITAL_TEMPLATE_DOCTORS } from "@/lib/config/tenantTemplates";

const BUSINESS_TYPES = Object.keys(VERTICAL_CONFIGS);
const PLAN_TIERS = ["billing_only", "billing_accounting"];
const SUBSCRIPTION_PLANS = ["monthly", "yearly", "custom"];
const RETENTION_OPTIONS = [0, 6, 12, 24];

// GET: All tenant organizations with subscription details and stats (platform staff only)
export async function GET() {
  try {
    const auth = await requireSuperAdminAction("read_analytics");
    if (!auth.authorized) return auth.response;

    await dbConnect();
    const orgs = await Organization.find({}).sort({ createdAt: -1 }).lean();
    const now = new Date();

    const tenants = await Promise.all(
      orgs.map(async (org: any) => {
        const [branchCount, userCount, productCount, adminUser, payments] = await Promise.all([
          Branch.countDocuments({ organizationId: org._id }),
          User.countDocuments({ organizationId: org._id }),
          Product.countDocuments({ organizationId: org._id }),
          User.findOne({ organizationId: org._id, role: "admin" }).sort({ createdAt: 1 }).select("fullName email").lean(),
          PaymentHistory.find({ organizationId: org._id }).sort({ paidAt: -1 }).lean(),
        ]);

        const expiryDate = org.expiryDate ? new Date(org.expiryDate) : now;
        const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Manual states always win over the date-derived status
        let computedStatus = org.subscriptionStatus || "active";
        if (!["suspended", "suspended_manual", "terminated"].includes(computedStatus)) {
          computedStatus = daysRemaining <= 0 ? "expired" : daysRemaining <= 7 ? "expiring_soon" : "active";
        }

        // PaymentHistory collection is the source of truth; the embedded array is legacy data only
        const paymentHistory =
          payments.length > 0
            ? payments.map((p: any) => ({
                id: p._id.toString(),
                amount: p.amount,
                paymentDate: p.paidAt,
                monthsAdded: p.monthsAdded,
                paymentMethod: p.paymentMethod,
                notes: p.notes,
              }))
            : (org.paymentHistory || []).map((p: any) => ({ ...p, id: undefined }));

        return {
          id: org._id.toString(),
          name: org.name,
          code: org.code,
          businessType: org.businessType,
          currency: org.currency,
          taxRate: org.taxRate,
          phone: org.phone || "",
          email: org.email || adminUser?.email || "",
          address: org.address || "",
          adminUserId: adminUser?._id?.toString() || null,
          adminName: adminUser?.fullName || "Not Set",
          adminEmail: adminUser?.email || "Not Set",
          planTier: org.planTier || "billing_only",
          accountingEnabled: org.planTier === "billing_accounting",
          dataRetentionMonths: org.dataRetentionMonths ?? 0,
          planLimits: org.planLimits,
          planPriceAtSelection: org.planPriceAtSelection ?? org.subscriptionFee ?? 0,
          subscriptionPlan: org.subscriptionPlan || "monthly",
          subscriptionFee: org.subscriptionFee ?? 0,
          subscriptionStatus: computedStatus,
          startDate: org.startDate || org.createdAt,
          expiryDate: expiryDate.toISOString(),
          lastPaymentDate: org.lastPaymentDate || org.createdAt,
          daysRemaining,
          paymentHistory,
          branchCount,
          userCount,
          productCount,
          createdAt: org.createdAt,
          fbr: org.fbr?.enabled
            ? { enabled: true, mode: org.fbr.mode, environment: org.fbr.environment }
            : { enabled: false },
          isPlatformOrg: !!(await User.exists({ organizationId: org._id, role: { $in: ["super_admin", "platform_support"] } })),
        };
      })
    );

    const billable = tenants.filter((t) => !t.isPlatformOrg && t.subscriptionStatus !== "terminated");

    // Recurring revenue only counts tenants that are currently paying (same rule as the revenue snapshot)
    const totalMRR = billable
      .filter((t) => t.subscriptionStatus === "active" || t.subscriptionStatus === "expiring_soon")
      .reduce(
      (sum, t) => sum + (t.subscriptionPlan === "yearly" ? t.subscriptionFee / 12 : t.subscriptionFee),
      0
    );

    return NextResponse.json({
      success: true,
      tenants,
      stats: {
        totalMRR,
        activeCount: billable.filter((t) => t.subscriptionStatus === "active").length,
        expiringSoonCount: billable.filter((t) => t.subscriptionStatus === "expiring_soon").length,
        expiredCount: billable.filter((t) => ["expired", "suspended", "suspended_manual"].includes(t.subscriptionStatus)).length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch tenants" : error.message },
      { status: 500 }
    );
  }
}

// POST: Provision a new tenant organization (super admin only)
export async function POST(req: Request) {
  const created: { org?: any; branch?: any; user?: any } = {};

  try {
    const auth = await requireSuperAdminAction("manage_pricing");
    if (!auth.authorized) return auth.response;
    const session = auth.session!;

    await dbConnect();
    const body = await req.json();

    const {
      name,
      businessType,
      adminName,
      adminEmail,
      adminPin,
      adminPassword,
      phone,
      address,
      city,
      taxRate = 16.0,
      planTier = "billing_accounting",
      dataRetentionMonths = 0,
      planLimits,
      subscriptionPlan = "monthly",
      subscriptionFee = 5000,
      durationMonths = 1,
      createSampleMenu = true,
      fbr,
    } = body;

    // ─── Validation ───
    if (!name || !businessType || !adminEmail || !adminPin) {
      return NextResponse.json(
        { error: "Business Name, Business Type, Admin Email, and Admin PIN are required" },
        { status: 400 }
      );
    }
    if (!BUSINESS_TYPES.includes(businessType)) return NextResponse.json({ error: "Invalid business type" }, { status: 400 });
    if (!PLAN_TIERS.includes(planTier)) return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
    if (!SUBSCRIPTION_PLANS.includes(subscriptionPlan)) return NextResponse.json({ error: "Invalid subscription plan" }, { status: 400 });
    if (!RETENTION_OPTIONS.includes(Number(dataRetentionMonths))) {
      return NextResponse.json({ error: "Data retention must be 0 (lifetime), 6, 12 or 24 months" }, { status: 400 });
    }
    if (!isValidPin(String(adminPin))) return NextResponse.json({ error: "Admin PIN must be exactly 4 digits" }, { status: 400 });
    if (adminPassword && String(adminPassword).length < 8) {
      return NextResponse.json({ error: "Admin password must be at least 8 characters" }, { status: 400 });
    }

    const fee = Number(subscriptionFee);
    const months = Number(durationMonths);
    const tax = Number(taxRate);
    if (!Number.isFinite(fee) || fee < 0) return NextResponse.json({ error: "Invalid subscription fee" }, { status: 400 });
    if (!Number.isInteger(months) || months < 1 || months > 36) return NextResponse.json({ error: "Duration must be 1–36 months" }, { status: 400 });
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) return NextResponse.json({ error: "Tax rate must be 0–100%" }, { status: 400 });

    // Optional: only businesses registered with FBR send these details
    const fbrResult = normalizeFbrSettings(fbr);
    if (fbrResult.error) return NextResponse.json({ error: `FBR: ${fbrResult.error}`, field: "fbr" }, { status: 400 });

    const normalizedEmail = String(adminEmail).toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) {
      return NextResponse.json({ error: `An account with email '${normalizedEmail}' already exists` }, { status: 400 });
    }

    const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "store";
    const code = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const now = new Date();
    const expiryDate = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

    // ─── 1. Organization ───
    created.org = await Organization.create({
      name: String(name).trim(),
      code,
      businessType: businessType as BusinessType,
      currency: "PKR",
      taxRate: tax,
      phone,
      email: normalizedEmail,
      address,
      planTier,
      accountingEnabled: planTier === "billing_accounting",
      dataRetentionMonths: Number(dataRetentionMonths),
      planLimits: {
        maxBranches: Math.max(1, Number(planLimits?.maxBranches) || 5),
        maxStaffUsers: Math.max(1, Number(planLimits?.maxStaffUsers) || 20),
      },
      planPriceAtSelection: fee,
      subscriptionPlan,
      subscriptionFee: fee,
      subscriptionStatus: "active",
      startDate: now,
      expiryDate,
      lastPaymentDate: now,
      fbr: fbrResult.settings,
    });
    const org = created.org;

    // ─── 2. Main Branch ───
    created.branch = await Branch.create({
      organizationId: org._id,
      name: `${name} - Main Branch`,
      code: "MAIN-01",
      city: city ? String(city) : "Main",
      address: address || "",
      phone: phone || "",
      isMain: true,
    });

    // ─── 3. Tenant Admin (always gets a password so email login and password reset work) ───
    const tempPassword = adminPassword ? undefined : generateTempPassword();
    created.user = await User.create({
      organizationId: org._id,
      branchId: created.branch._id,
      fullName: adminName || `${name} Owner`,
      email: normalizedEmail,
      password: adminPassword || tempPassword,
      pin: String(adminPin),
      role: "admin",
      isActive: true,
    });

    // ─── 4. Initial payment record ───
    if (fee > 0) {
      await PaymentHistory.create({
        organizationId: org._id,
        tenantName: org.name,
        amount: fee * (subscriptionPlan === "yearly" ? 1 : months),
        currency: org.currency,
        planTier,
        billingCycle: subscriptionPlan,
        monthsAdded: months,
        paymentMethod: "manual",
        paidAt: now,
        expiresAt: expiryDate,
        notes: `Initial signup (${months} month access)`,
        createdBy: session.userId,
      });
    }

    // ─── 5. Optional starter catalogue ───
    let sampleProductsCount = 0;
    if (createSampleMenu) {
      if (businessType === "hospital") {
        await Doctor.insertMany(
          HOSPITAL_TEMPLATE_DOCTORS.map((d) => ({ ...d, organizationId: org._id, branchId: created.branch._id }))
        );
      }
      const template = TENANT_TEMPLATE_ITEMS[businessType as BusinessType] || [];
      if (template.length > 0) {
        const createdProds = await Product.insertMany(
          template.map((item, idx) => ({
            ...item,
            organizationId: org._id,
            barcode: `890${Date.now().toString().slice(-6)}${String(idx).padStart(2, "0")}`,
          }))
        );
        sampleProductsCount = createdProds.length;
      }
    }

    await logAudit({
      organizationId: org._id,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: "TENANT_PROVISIONED",
      targetCollection: "Organization",
      targetId: org._id,
      after: { code, planTier, subscriptionFee: fee, months },
    });

    return NextResponse.json({
      success: true,
      message: `Tenant '${name}' provisioned successfully for ${VERTICAL_CONFIGS[businessType as BusinessType]?.title || businessType}!`,
      tenant: {
        id: org._id.toString(),
        name: org.name,
        code: org.code, // store code used for PIN login at /login
        businessType: org.businessType,
        adminEmail: normalizedEmail,
        tempPassword, // shown once; the admin should change it via "Forgot Password"
        subscriptionFee: fee,
        expiryDate: expiryDate.toISOString(),
        sampleProductsCount,
      },
    });
  } catch (error: any) {
    // Roll back partially provisioned tenant so a retry starts clean
    if (created.org) {
      const orgId = created.org._id;
      await Promise.allSettled([
        Organization.deleteOne({ _id: orgId }),
        Branch.deleteMany({ organizationId: orgId }),
        User.deleteMany({ organizationId: orgId }),
        Product.deleteMany({ organizationId: orgId }),
        Doctor.deleteMany({ organizationId: orgId }),
        PaymentHistory.deleteMany({ organizationId: orgId }),
      ]);
    }
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create tenant" : error.message },
      { status: 500 }
    );
  }
}
