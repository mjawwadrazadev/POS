import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { User } from "@/models/User";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";

export async function GET() {
  try {
    await dbConnect();

    // Clear existing sample collections for clean seed
    await Organization.deleteMany({});
    await Branch.deleteMany({});
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    const now = new Date();

    // ─── 1. SUPER ADMIN SYSTEM ORGANISATION ───
    const masterOrg = await Organization.create({
      name: "RST POS Platform HQ",
      code: "rst-hq",
      businessType: "bakery",
      currency: "PKR",
      taxRate: 16.0,
      phone: "+92 42 111 000 000",
      email: "superadmin@rstpos.com",
      address: "NIB IT Solutions Tower, Gulberg, Lahore",
      subscriptionPlan: "custom",
      subscriptionFee: 0,
      subscriptionStatus: "active",
      startDate: now,
      expiryDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    });

    const masterBranch = await Branch.create({
      organizationId: masterOrg._id,
      name: "HQ Operations",
      code: "HQ-01",
      city: "Lahore",
      address: "Gulberg III, Lahore",
      phone: "+92 42 111 000 000",
      isMain: true,
    });

    await User.create({
      organizationId: masterOrg._id,
      branchId: masterBranch._id,
      fullName: "System Super Admin",
      email: "superadmin@rstpos.com",
      password: "admin123",
      pin: "9999",
      role: "super_admin",
      isActive: true,
    });

    // ─── 2. TENANT 1: BAKERY (ACTIVE — Fee: 5,000/mo, Expiry: +25 days) ───
    const bakeryOrg = await Organization.create({
      name: "RST Bakers & Confectionery Chain",
      code: "rst-bakery",
      businessType: "bakery",
      currency: "PKR",
      taxRate: 16.0,
      phone: "+92 42 111 778 778",
      email: "bakers@rstpos.com",
      address: "Main Boulevard, Gulberg III, Lahore, Pakistan",
      subscriptionPlan: "monthly",
      subscriptionFee: 5000,
      subscriptionStatus: "active",
      startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
      lastPaymentDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      paymentHistory: [
        {
          amount: 5000,
          paymentDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          monthsAdded: 1,
          notes: "Monthly Subscription Fee",
        },
      ],
    });

    const bakeryBranchLhr = await Branch.create({
      organizationId: bakeryOrg._id,
      name: "Gulberg Main Bakery - Lahore",
      code: "LHR-01",
      city: "Lahore",
      address: "Gulberg III, Lahore",
      phone: "+92 42 35711223",
      isMain: true,
    });

    const bakeryAdmin = await User.create({
      organizationId: bakeryOrg._id,
      branchId: bakeryBranchLhr._id,
      fullName: "Ahmed Ali (Head Baker)",
      email: "admin@rstpos.com",
      password: "admin123",
      pin: "1234",
      role: "admin",
      isActive: true,
    });

    await Product.insertMany([
      {
        organizationId: bakeryOrg._id,
        name: "Red Velvet Cream Fudge Cake (2 Pound)",
        sku: "BAK-101",
        barcode: "8901234567001",
        category: "Cakes",
        price: 2400,
        costPrice: 1400,
        stock: 12,
        unit: "Pcs",
        flavour: "Red Velvet & Cocoa",
        weightGrams: 900,
        expiryTime: "48 Hours",
        isPerishable: true,
      },
      {
        organizationId: bakeryOrg._id,
        name: "French Butter Croissant (Fresh Batch)",
        sku: "BAK-102",
        barcode: "8901234567002",
        category: "Pastries & Breads",
        price: 320,
        costPrice: 180,
        stock: 45,
        unit: "Pcs",
        expiryTime: "24 Hours",
        isPerishable: true,
      },
    ]);

    // ─── 3. TENANT 2: RESTAURANT (EXPIRING SOON — Fee: 10,000/mo, Expiry: +3 days) ───
    const restOrg = await Organization.create({
      name: "Royal Spice Grill & Restaurant",
      code: "royal-spice",
      businessType: "restaurant",
      currency: "PKR",
      taxRate: 16.0,
      phone: "+92 300 9876543",
      email: "restaurant@rstpos.com",
      address: "MM Alam Road, Gulberg, Lahore",
      subscriptionPlan: "monthly",
      subscriptionFee: 10000,
      subscriptionStatus: "expiring_soon",
      startDate: new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // Expiring in 3 days!
      lastPaymentDate: new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000),
      paymentHistory: [
        {
          amount: 10000,
          paymentDate: new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000),
          monthsAdded: 1,
          notes: "Monthly Subscription Fee",
        },
      ],
    });

    const restBranch = await Branch.create({
      organizationId: restOrg._id,
      name: "MM Alam Main Branch",
      code: "REST-01",
      city: "Lahore",
      address: "MM Alam Road, Lahore",
      phone: "+92 300 9876543",
      isMain: true,
    });

    await User.create({
      organizationId: restOrg._id,
      branchId: restBranch._id,
      fullName: "Tariq Mahmood (Restaurant Owner)",
      email: "restaurant@rstpos.com",
      password: "admin123",
      pin: "2222",
      role: "admin",
      isActive: true,
    });

    await Product.insertMany([
      {
        organizationId: restOrg._id,
        name: "Chicken Karahi Special (1KG)",
        sku: "FD-101",
        barcode: "8901234567101",
        category: "Main Course",
        price: 1800,
        costPrice: 1200,
        stock: 50,
        unit: "KG",
        preparationTime: 25,
      },
    ]);

    // ─── 4. TENANT 3: PHARMACY (ACTIVE — Fee: 6,000/mo, Expiry: +18 days) ───
    const pharmOrg = await Organization.create({
      name: "HealthPlus Medico & Pharmacy",
      code: "health-plus",
      businessType: "pharmacy",
      currency: "PKR",
      taxRate: 5.0,
      phone: "+92 42 37778899",
      email: "pharmacy@rstpos.com",
      address: "Jail Road, Medical Zone, Lahore",
      subscriptionPlan: "monthly",
      subscriptionFee: 6000,
      subscriptionStatus: "active",
      startDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
      lastPaymentDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      paymentHistory: [
        {
          amount: 6000,
          paymentDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
          monthsAdded: 1,
          notes: "Monthly Subscription Fee",
        },
      ],
    });

    const pharmBranch = await Branch.create({
      organizationId: pharmOrg._id,
      name: "Jail Road Pharmacy",
      code: "PHARM-01",
      city: "Lahore",
      address: "Jail Road, Lahore",
      phone: "+92 42 37778899",
      isMain: true,
    });

    await User.create({
      organizationId: pharmOrg._id,
      branchId: pharmBranch._id,
      fullName: "Dr. Usman Raza (Pharmacist)",
      email: "pharmacy@rstpos.com",
      password: "admin123",
      pin: "3333",
      role: "admin",
      isActive: true,
    });

    // ─── 5. TENANT 4: EXPIRED TENANT (EXPIRED — Fee: 8,000/mo, Expired 2 days ago!) ───
    const expiredOrg = await Organization.create({
      name: "Al-Madina Sweets & Bakery",
      code: "al-madina",
      businessType: "bakery",
      currency: "PKR",
      taxRate: 16.0,
      phone: "+92 321 5554433",
      email: "expired@rstpos.com",
      address: "Johar Town, Lahore",
      subscriptionPlan: "monthly",
      subscriptionFee: 8000,
      subscriptionStatus: "expired",
      startDate: new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Expired 2 days ago!
      lastPaymentDate: new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000),
      paymentHistory: [
        {
          amount: 8000,
          paymentDate: new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000),
          monthsAdded: 1,
          notes: "Monthly Subscription Fee (Overdue)",
        },
      ],
    });

    const expiredBranch = await Branch.create({
      organizationId: expiredOrg._id,
      name: "Johar Town Branch",
      code: "MAD-01",
      city: "Lahore",
      address: "Johar Town, Lahore",
      phone: "+92 321 5554433",
      isMain: true,
    });

    await User.create({
      organizationId: expiredOrg._id,
      branchId: expiredBranch._id,
      fullName: "Zubair Ahmad (Owner)",
      email: "expired@rstpos.com",
      password: "admin123",
      pin: "4444",
      role: "admin",
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: "Database seeded with Bcrypt Salted Hashed Passwords & PINs for Super Admin & Tenants!",
      data: {
        superAdmin: "superadmin@rstpos.com (Password: admin123, PIN: 9999)",
        tenants: [
          { name: bakeryOrg.name, email: bakeryAdmin.email, pin: "1234", fee: "5,000/mo" },
          { name: restOrg.name, email: "restaurant@rstpos.com", pin: "2222", fee: "10,000/mo" },
          { name: pharmOrg.name, email: "pharmacy@rstpos.com", pin: "3333", fee: "6,000/mo" },
          { name: expiredOrg.name, email: "expired@rstpos.com", pin: "4444", fee: "8,000/mo" },
        ],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to seed database" },
      { status: 500 }
    );
  }
}
