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

    const superAdminUser = await User.create({
      organizationId: masterOrg._id,
      branchId: masterBranch._id,
      fullName: "System Super Admin",
      email: "superadmin@rstpos.com",
      pin: "9999",
      role: "super_admin",
      isActive: true,
    });

    // ─── 2. TENANT 1: BAKERY ───
    const bakeryOrg = await Organization.create({
      name: "RST Bakers & Confectionery Chain",
      code: "rst-bakery",
      businessType: "bakery",
      currency: "PKR",
      taxRate: 16.0,
      phone: "+92 42 111 778 778",
      email: "bakers@rstpos.com",
      address: "Main Boulevard, Gulberg III, Lahore, Pakistan",
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
      pin: "1234",
      role: "admin",
      isActive: true,
    });

    const bakeryProducts = await Product.insertMany([
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
      {
        organizationId: bakeryOrg._id,
        name: "Pineapple Fresh Cream Pastry",
        sku: "BAK-103",
        barcode: "8901234567003",
        category: "Pastries & Breads",
        price: 280,
        costPrice: 150,
        stock: 30,
        unit: "Pcs",
        expiryTime: "36 Hours",
        isPerishable: true,
      },
    ]);

    // ─── 3. TENANT 2: RESTAURANT ───
    const restOrg = await Organization.create({
      name: "Royal Spice Grill & Restaurant",
      code: "royal-spice",
      businessType: "restaurant",
      currency: "PKR",
      taxRate: 16.0,
      phone: "+92 42 35889900",
      email: "restaurant@rstpos.com",
      address: "MM Alam Road, Gulberg, Lahore",
    });

    const restBranch = await Branch.create({
      organizationId: restOrg._id,
      name: "MM Alam Main Branch",
      code: "REST-01",
      city: "Lahore",
      address: "MM Alam Road, Lahore",
      phone: "+92 42 35889900",
      isMain: true,
    });

    const restAdmin = await User.create({
      organizationId: restOrg._id,
      branchId: restBranch._id,
      fullName: "Tariq Mahmood (Restaurant Admin)",
      email: "restaurant@rstpos.com",
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
      {
        organizationId: restOrg._id,
        name: "Beef Nihari (Large Bowl)",
        sku: "FD-102",
        barcode: "8901234567102",
        category: "Main Course",
        price: 1400,
        costPrice: 900,
        stock: 30,
        unit: "Bowl",
        preparationTime: 40,
      },
      {
        organizationId: restOrg._id,
        name: "Mutton Live BBQ Karahi",
        sku: "FD-103",
        barcode: "8901234567103",
        category: "Main Course",
        price: 3200,
        costPrice: 2200,
        stock: 20,
        unit: "KG",
        preparationTime: 35,
      },
    ]);

    // ─── 4. TENANT 3: PHARMACY ───
    const pharmOrg = await Organization.create({
      name: "HealthPlus Medico & Pharmacy",
      code: "health-plus",
      businessType: "pharmacy",
      currency: "PKR",
      taxRate: 5.0,
      phone: "+92 42 37778899",
      email: "pharmacy@rstpos.com",
      address: "Jail Road, Medical Zone, Lahore",
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
      pin: "3333",
      role: "admin",
      isActive: true,
    });

    await Product.insertMany([
      {
        organizationId: pharmOrg._id,
        name: "Paracetamol 500mg Extra",
        sku: "MED-001",
        barcode: "8901234567891",
        category: "Medicines",
        price: 150,
        costPrice: 110,
        stock: 120,
        unit: "Pcs",
        batchNumber: "BCH-9921",
        expiryDate: new Date("2027-08-15"),
        genericName: "Acetaminophen",
      },
      {
        organizationId: pharmOrg._id,
        name: "Amoxicillin 250mg Antibiotic",
        sku: "MED-002",
        barcode: "8901234567892",
        category: "Medicines",
        price: 450,
        costPrice: 340,
        stock: 45,
        unit: "Box",
        batchNumber: "BCH-8810",
        expiryDate: new Date("2026-11-20"),
        genericName: "Amoxicillin Trihydrate",
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Multi-tenant database seeded successfully with Super Admin & 3 distinct vertical tenants!",
      data: {
        superAdmin: "superadmin@rstpos.com (PIN: 9999)",
        tenants: [
          { name: bakeryOrg.name, email: bakeryAdmin.email, pin: "1234", type: "bakery" },
          { name: restOrg.name, email: restAdmin.email, pin: "2222", type: "restaurant" },
          { name: pharmOrg.name, email: "pharmacy@rstpos.com", pin: "3333", type: "pharmacy" },
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
