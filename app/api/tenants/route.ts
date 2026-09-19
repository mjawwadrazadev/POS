import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { User } from "@/models/User";
import { Product } from "@/models/Product";
import { BusinessType, VERTICAL_CONFIGS } from "@/lib/config/verticals";

// GET: Fetch all tenant organizations with their stats
export async function GET() {
  try {
    await dbConnect();

    const orgs = await Organization.find({}).sort({ createdAt: -1 }).lean();

    const tenants = await Promise.all(
      orgs.map(async (org) => {
        const branchCount = await Branch.countDocuments({ organizationId: org._id });
        const userCount = await User.countDocuments({ organizationId: org._id });
        const productCount = await Product.countDocuments({ organizationId: org._id });
        const adminUser = await User.findOne({ organizationId: org._id, role: "admin" }).lean();

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
          adminName: adminUser?.fullName || "Not Set",
          adminEmail: adminUser?.email || "Not Set",
          adminPin: adminUser?.pin || "1234",
          branchCount,
          userCount,
          productCount,
          createdAt: org.createdAt,
        };
      })
    );

    return NextResponse.json({ success: true, tenants });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

// POST: Provision a new tenant organization + branch + admin user + sample menu
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const {
      name,
      businessType,
      adminName,
      adminEmail,
      adminPin,
      phone,
      address,
      taxRate = 16.0,
      createSampleMenu = true,
    } = body;

    if (!name || !businessType || !adminEmail || !adminPin) {
      return NextResponse.json(
        { error: "Business Name, Business Type, Admin Email, and Admin PIN are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: `An account with email '${adminEmail}' already exists` },
        { status: 400 }
      );
    }

    // Generate unique code
    const code = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") + "-" + Date.now().toString().slice(-4);

    // 1. Create Organization
    const org = await Organization.create({
      name,
      code,
      businessType: businessType as BusinessType,
      currency: "PKR",
      taxRate: Number(taxRate),
      phone,
      email: adminEmail,
      address,
    });

    // 2. Create Main Branch
    const branch = await Branch.create({
      organizationId: org._id,
      name: `${name} - Main Branch`,
      code: "MAIN-01",
      city: "Lahore",
      address: address || "Main Branch Address",
      phone: phone || "+92 42 111 222 333",
      isMain: true,
    });

    // 3. Create Tenant Admin User
    const adminUser = await User.create({
      organizationId: org._id,
      branchId: branch._id,
      fullName: adminName || `${name} Owner`,
      email: adminEmail.toLowerCase().trim(),
      pin: adminPin,
      role: "admin",
      isActive: true,
    });

    // 4. Optionally seed template items based on Business Type
    let sampleProductsCount = 0;
    if (createSampleMenu) {
      const templateItems: Record<BusinessType, any[]> = {
        bakery: [
          { name: "Special Cream Fudge Cake (2 Pound)", sku: "BAK-101", category: "Cakes", price: 2400, costPrice: 1400, stock: 15, unit: "Pcs", flavour: "Chocolate Cream", weightGrams: 900, expiryTime: "48 Hours", isPerishable: true },
          { name: "Butter Milk Croissant", sku: "BAK-102", category: "Pastries & Breads", price: 300, costPrice: 160, stock: 40, unit: "Pcs", expiryTime: "24 Hours", isPerishable: true },
          { name: "Garlic Toast Slices", sku: "BAK-103", category: "Breads", price: 350, costPrice: 180, stock: 25, unit: "Pack", expiryTime: "3 Days" },
        ],
        restaurant: [
          { name: "Special Chicken Karahi (1KG)", sku: "FD-101", category: "Main Course", price: 1950, costPrice: 1250, stock: 50, unit: "KG", preparationTime: 25 },
          { name: "Special Beef Seekh Kabab (6 Pcs)", sku: "FD-102", category: "Appetizers", price: 1200, costPrice: 750, stock: 30, unit: "Plate", preparationTime: 20 },
          { name: "Fresh Mint Lemonade", sku: "BV-101", category: "Beverages", price: 350, costPrice: 150, stock: 100, unit: "Glass", preparationTime: 5 },
        ],
        cafe: [
          { name: "Double Shot Espresso", sku: "CAF-101", category: "Hot Drinks", price: 450, costPrice: 180, stock: 100, unit: "Cup", preparationTime: 5 },
          { name: "Spanish Latte Iced Coffee", sku: "CAF-102", category: "Cold Drinks", price: 680, costPrice: 320, stock: 80, unit: "Cup", preparationTime: 5 },
          { name: "Club Sandwich with Fries", sku: "CAF-103", category: "Snacks", price: 850, costPrice: 450, stock: 30, unit: "Plate", preparationTime: 15 },
        ],
        pharmacy: [
          { name: "Panadol Extra 500mg (Strip)", sku: "MED-101", category: "Medicines", price: 120, costPrice: 85, stock: 200, unit: "Pcs", batchNumber: "BCH-001", genericName: "Paracetamol" },
          { name: "Augmentin 625mg Tablets", sku: "MED-102", category: "Medicines", price: 550, costPrice: 420, stock: 60, unit: "Box", batchNumber: "BCH-002", genericName: "Co-amoxiclav" },
        ],
        retail: [
          { name: "Cotton Casual T-Shirt", sku: "RTL-101", category: "Apparel", price: 1490, costPrice: 850, stock: 45, unit: "Pcs" },
          { name: "Leather Wallet Premium", sku: "RTL-102", category: "Accessories", price: 2200, costPrice: 1200, stock: 20, unit: "Pcs" },
        ],
        supermarket: [
          { name: "Basmati Rice Extra Long (5KG)", sku: "GR-101", category: "Groceries", price: 2100, costPrice: 1750, stock: 50, unit: "Pack" },
          { name: "Pure Cooking Oil (5 Litre)", sku: "GR-102", category: "Groceries", price: 2850, costPrice: 2450, stock: 40, unit: "Bottle" },
        ],
        electronics: [
          { name: "Fast Charging Type-C Cable (65W)", sku: "ELE-101", category: "Accessories", price: 1250, costPrice: 700, stock: 35, unit: "Pcs", warrantyMonths: 6 },
          { name: "Wireless Earbuds Noise Cancelling", sku: "ELE-102", category: "Audio", price: 4500, costPrice: 3100, stock: 15, unit: "Pcs", serialNumber: "SN-EAR-99", warrantyMonths: 12 },
        ],
        clothing: [
          { name: "Embroidered Kurta Casual", sku: "CLO-101", category: "Men's Wear", price: 3800, costPrice: 2400, stock: 25, unit: "Pcs", size: "L", color: "White" },
          { name: "Designer Linen Dupatta", sku: "CLO-102", category: "Women's Wear", price: 2200, costPrice: 1300, stock: 30, unit: "Pcs", size: "Free Size", color: "Multicolor" },
        ],
        salon: [
          { name: "Gentleman Haircut & Beard Styling", sku: "SLN-101", category: "Hair Services", price: 1500, costPrice: 400, stock: 999, unit: "Service" },
          { name: "Deep Cleansing Facial Treatment", sku: "SLN-102", category: "Skin Services", price: 3500, costPrice: 1200, stock: 999, unit: "Service" },
        ],
      };

      const productsToCreate = (templateItems[businessType as BusinessType] || templateItems.bakery).map((item) => ({
        ...item,
        organizationId: org._id,
        barcode: `890${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
      }));

      const createdProds = await Product.insertMany(productsToCreate);
      sampleProductsCount = createdProds.length;
    }

    return NextResponse.json({
      success: true,
      message: `Tenant '${name}' provisioned successfully for ${VERTICAL_CONFIGS[businessType as BusinessType]?.title || businessType}!`,
      tenant: {
        id: org._id.toString(),
        name: org.name,
        businessType: org.businessType,
        adminEmail: adminUser.email,
        adminPin: adminUser.pin,
        sampleProductsCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create tenant" },
      { status: 500 }
    );
  }
}
