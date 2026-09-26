"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePosStore } from "@/lib/store/usePosStore";
import { BusinessType, VERTICAL_CONFIGS } from "@/lib/config/verticals";
import {
  LayoutDashboard,
  ShoppingCart,
  Clock,
  Package,
  Layers,
  FileSpreadsheet,
  Users,
  BarChart3,
  ChevronDown,
  ShieldCheck,
  LogOut,
  Cake,
  Utensils,
  Pill,
  Tv,
  Shirt,
  Scissors,
  Building2,
  Stethoscope,
  Store,
  ChefHat,
  Settings,
  Printer,
  Receipt,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentVertical, setVertical } = usePosStore();

  const [userSession, setUserSession] = useState<any | null>(null);

  // Accordion open states
  const [posGroupOpen, setPosGroupOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUserSession(data.user);
          const platform = data.user.role === "super_admin" || data.user.role === "platform_support";
          if ((!platform || data.user.isImpersonating) && data.user.businessType) {
            setVertical(data.user.businessType);
          }
        }
      } catch (e) {
        console.error("Auth session check failed", e);
      }
    }
    checkAuth();
  }, [setVertical]);

  async function handleLogout() {
    const loginPath = isSuperAdmin ? "/super-admin/login" : "/login";
    try {
      await fetch("/api/auth/me", { method: "POST" });
    } catch (e) {
      console.error("Logout failed", e);
    }
    window.location.href = loginPath;
  }

  const verticalIcons: Record<BusinessType, React.ReactNode> = {
    bakery: <Cake className="w-4 h-4 text-amber-500" />,
    restaurant: <Utensils className="w-4 h-4 text-emerald-400" />,
    cafe: <Utensils className="w-4 h-4 text-amber-400" />,
    pharmacy: <Pill className="w-4 h-4 text-rose-400" />,
    retail: <ShoppingCart className="w-4 h-4 text-blue-400" />,
    supermarket: <Store className="w-4 h-4 text-cyan-400" />,
    electronics: <Tv className="w-4 h-4 text-purple-400" />,
    clothing: <Shirt className="w-4 h-4 text-pink-400" />,
    salon: <Scissors className="w-4 h-4 text-teal-400" />,
    hospital: <Stethoscope className="w-4 h-4 text-cyan-400" />,
  };

  const isActive = (path: string) => pathname === path;
  // Platform staff (super admin / support) see the platform menu unless they are impersonating a store
  const isSuperAdmin =
    (userSession?.role === "super_admin" || userSession?.role === "platform_support") && !userSession?.isImpersonating;
  const isStoreManager = userSession?.role === "admin" || userSession?.role === "manager";
  const isAccountingEnabled = userSession?.planTier === "billing_accounting" && isStoreManager;
  const hasKitchen = currentVertical === "restaurant" || currentVertical === "cafe" || currentVertical === "bakery";

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar__brand flex items-center gap-3">
        <div className="w-10 h-10 bg-[#002bba] text-white flex items-center justify-center font-accent font-extrabold text-[1.8rem] rounded-md border border-blue-400/30">
          RST
        </div>
        <div>
          <div className="sidebar__brand-name text-[1.6rem]">RST POS</div>
          <div className="sidebar__brand-sub text-[1.1rem]">
            {isSuperAdmin ? "SUPER ADMIN PLATFORM HQ" : userSession?.organizationName || "Store POS Platform"}
          </div>
        </div>
      </div>

      {/* Active Engine Badge (Only for Client Store) */}
      {!isSuperAdmin && (
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
          <div className="flex items-center justify-between mb-1.5">
            <label className="sidebar__section-label p-0 block">Active Engine</label>
            <span className="text-[1rem] font-accent text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5">
              LOCKED
            </span>
          </div>

          <div className="bg-[#171719] border border-[rgba(255,255,255,0.15)] px-3 py-2 text-[1.3rem] font-accent font-bold text-white uppercase flex items-center gap-2 rounded">
            {verticalIcons[currentVertical]}
            <span>{VERTICAL_CONFIGS[currentVertical]?.title || currentVertical}</span>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="sidebar__nav">
        {/* ─── 1. SUPER ADMIN MODE (Only Tenants & Subscriptions link) ─── */}
        {isSuperAdmin ? (
          <div className="space-y-3">
            <div className="text-[1.1rem] font-accent uppercase text-emerald-400 font-extrabold px-3 pt-2 tracking-wider">
              PLATFORM CONTROL CENTER
            </div>

            <Link
              href="/super-admin"
              className={`sidebar__link bg-[#002bba]/25 border border-[#002bba]/60 text-blue-300 font-extrabold py-3.5 text-[1.4rem] ${
                isActive("/super-admin") ? "sidebar__link--active" : ""
              }`}
            >
              <Building2 className="w-5 h-5 text-accent" />
              <span className="flex-1 truncate">Tenants & Access</span>
              <span className="sidebar__badge bg-accent text-white font-bold px-2 py-0.5">SUPER ADMIN</span>
            </Link>

            <div className="p-4 bg-[#141417] border border-[rgba(255,255,255,0.08)] rounded-lg font-accent text-[1.2rem] text-gray-400 space-y-2 mt-4">
              <div className="font-bold text-white text-[1.3rem] flex items-center gap-2 text-blue-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Super Admin Role
              </div>
              <p>
                As Platform Owner, your responsibility is provisioning client tenants, setting fees, and managing subscriptions.
              </p>
            </div>
          </div>
        ) : (
          /* ─── 2. CLIENT STORE MODE (Full Store Operational Navigation) ─── */
          <>
            {/* Executive Dashboard */}
            <Link
              href="/"
              className={`sidebar__link ${isActive("/") ? "sidebar__link--active" : ""}`}
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span>Dashboard</span>
            </Link>

            {/* POS Operations Group */}
            <button
              type="button"
              onClick={() => setPosGroupOpen(!posGroupOpen)}
              className="sidebar__link w-full justify-between focus:outline-none cursor-pointer mt-2"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-4 h-4 flex-shrink-0" />
                <span>POS Operations</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  posGroupOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {posGroupOpen && (
              <div className="flex flex-col gap-1 pl-4">
                <Link
                  href="/pos"
                  className={`sidebar__link ${isActive("/pos") ? "sidebar__link--active" : ""}`}
                >
                  <ShoppingCart className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 truncate">POS Billing</span>
                  <span className="sidebar__badge ml-auto flex-shrink-0">LIVE</span>
                </Link>
                <Link
                  href="/orders"
                  className={`sidebar__link ${isActive("/orders") ? "sidebar__link--active" : ""}`}
                >
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Orders & Receipts</span>
                </Link>
                {hasKitchen && (
                  <Link
                    href="/kds"
                    className={`sidebar__link ${isActive("/kds") ? "sidebar__link--active" : ""}`}
                  >
                    <ChefHat className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Kitchen Display</span>
                  </Link>
                )}
              </div>
            )}

            {/* Hospital Management Section */}
            {currentVertical === "hospital" && (
              <div className="flex flex-col gap-1 mt-2">
                <div className="text-[1rem] font-accent uppercase text-cyan-400 font-bold px-3 py-1 tracking-wider">
                  Hospital Operations
                </div>
                <Link
                  href="/consultations"
                  className={`sidebar__link ${isActive("/consultations") ? "sidebar__link--active" : ""}`}
                >
                  <Receipt className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                  <span className="truncate">Consultation Billing</span>
                </Link>
                <Link
                  href="/doctors"
                  className={`sidebar__link ${isActive("/doctors") ? "sidebar__link--active" : ""}`}
                >
                  <Stethoscope className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                  <span className="truncate">Doctor Directory</span>
                </Link>
                <Link
                  href="/reports/doctors"
                  className={`sidebar__link ${isActive("/reports/doctors") ? "sidebar__link--active" : ""}`}
                >
                  <BarChart3 className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                  <span className="truncate">Doctor Revenue Reports</span>
                </Link>
              </div>
            )}

            {/* Inventory Group */}
            <button
              type="button"
              onClick={() => setInventoryOpen(!inventoryOpen)}
              className="sidebar__link w-full justify-between focus:outline-none cursor-pointer mt-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Package className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Inventory & Stock</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                  inventoryOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {inventoryOpen && (
              <div className="flex flex-col gap-1 pl-4">
                <Link
                  href="/products"
                  className={`sidebar__link ${isActive("/products") ? "sidebar__link--active" : ""}`}
                >
                  <Package className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Products & SKUs</span>
                </Link>
                <Link
                  href="/inventory/stock"
                  className={`sidebar__link ${isActive("/inventory/stock") ? "sidebar__link--active" : ""}`}
                >
                  <Layers className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Stock Transfers</span>
                </Link>
              </div>
            )}

            {/* Finance Group */}
            {isAccountingEnabled && (
              <>
                <button
                  type="button"
                  onClick={() => setFinanceOpen(!financeOpen)}
                  className="sidebar__link w-full justify-between focus:outline-none cursor-pointer mt-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Finance & Ledger</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                      financeOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {financeOpen && (
                  <div className="flex flex-col gap-1 pl-4">
                    <Link
                      href="/accounting/ledger"
                      className={`sidebar__link ${isActive("/accounting/ledger") ? "sidebar__link--active" : ""}`}
                    >
                      <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Double-Entry Ledger</span>
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* HRMS & Staff */}
            <Link
              href="/hr"
              className={`sidebar__link mt-2 ${isActive("/hr") ? "sidebar__link--active" : ""}`}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>Attendance & Payroll</span>
            </Link>

            {/* Analytics */}
            <Link
              href="/reports"
              className={`sidebar__link ${isActive("/reports") ? "sidebar__link--active" : ""}`}
            >
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              <span>EOD & Sales Reports</span>
            </Link>

            {/* Store Settings */}
            {isStoreManager && (
              <>
                <Link
                  href="/settings/team"
                  className={`sidebar__link mt-2 ${isActive("/settings/team") ? "sidebar__link--active" : ""}`}
                >
                  <Settings className="w-4 h-4 flex-shrink-0" />
                  <span>Team, Branches & Tables</span>
                </Link>
                <Link
                  href="/settings/printers"
                  className={`sidebar__link ${isActive("/settings/printers") ? "sidebar__link--active" : ""}`}
                >
                  <Printer className="w-4 h-4 flex-shrink-0" />
                  <span>Printers</span>
                </Link>
              </>
            )}

            {/* Platform Support Desk */}
            <Link
              href="/support"
              className={`sidebar__link mt-2 text-blue-400 font-bold ${isActive("/support") ? "sidebar__link--active" : ""}`}
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-blue-400" />
              <span>Platform Support Desk</span>
            </Link>
          </>
        )}
      </nav>

      {/* User Footer */}
      <div className="sidebar__user">
        <div className="sidebar__avatar avatar-round">
          <span>{userSession?.fullName ? userSession.fullName.slice(0, 2).toUpperCase() : "SA"}</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="sidebar__user-name truncate">
            {userSession?.fullName || "System Super Admin"}
          </div>
          <div className="sidebar__user-role flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400 inline flex-shrink-0" />
            <span className="uppercase text-[1.05rem]">
              {userSession?.role ? userSession.role.replace("_", " ") : "SUPER ADMIN"} / ACTIVE
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-400 transition-colors p-1"
          title="Logout / Switch Account"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
