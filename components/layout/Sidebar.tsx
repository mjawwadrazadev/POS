"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePosStore } from "@/lib/store/usePosStore";
import { VERTICAL_CONFIGS, BusinessType } from "@/lib/config/verticals";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Store,
  FileSpreadsheet,
  Users,
  BarChart3,
  ChevronDown,
  Layers,
  Clock,
  ShieldCheck,
  LogOut,
  Utensils,
  Pill,
  Tv,
  Scissors,
  Shirt,
  Cake,
  Building2,
  Stethoscope,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentVertical, setVertical, selectedBranch } = usePosStore();

  const [posGroupOpen, setPosGroupOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(false);

  const [userSession, setUserSession] = useState<{
    fullName: string;
    email: string;
    role: string;
    organizationName?: string;
    businessType?: BusinessType;
    planTier?: "billing_only" | "billing_accounting";
    accountingEnabled?: boolean;
  } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUserSession(data.user);
          // If user is regular tenant (not super_admin), lock their vertical
          if (data.user.role !== "super_admin" && data.user.businessType) {
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
    try {
      await fetch("/api/auth/me", { method: "POST" });
      window.location.href = "/login";
    } catch (e) {
      console.error("Logout failed", e);
      window.location.href = "/login";
    }
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

  function isActive(path: string) {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }

  const isSuperAdmin = userSession?.role === "super_admin";
  const isAccountingEnabled = isSuperAdmin || userSession?.planTier === "billing_accounting";


  return (
    <aside className="sidebar">
      {/* Logo Header */}
      <div className="sidebar__logo">
        <div>
          <div className="sidebar__logo-text">
            RST<span>POS</span>
          </div>
          <div className="text-[1.1rem] font-accent text-[rgba(255,255,255,0.45)] mt-1 tracking-wider uppercase truncate">
            {userSession?.organizationName || "NIB IT Enterprise Platform"}
          </div>
        </div>
      </div>

      {/* Vertical Engine Selector (Enabled for Super Admin, Locked for Tenant Admin) */}
      <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
        <div className="flex items-center justify-between mb-2">
          <label className="sidebar__section-label p-0 block">
            {isSuperAdmin ? "Engine Selector (Super Admin)" : "Active Business Engine"}
          </label>
          {!isSuperAdmin && (
            <span className="text-[1rem] font-accent text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5">
              LOCKED
            </span>
          )}
        </div>

        {isSuperAdmin ? (
          <div className="relative">
            <select
              value={currentVertical}
              onChange={(e) => setVertical(e.target.value as BusinessType)}
              className="w-full bg-[#171719] text-white border border-[rgba(255,255,255,0.15)] text-[1.3rem] py-2 px-3 focus:outline-none focus:border-[#002bba] cursor-pointer appearance-none font-accent font-semibold"
            >
              {Object.entries(VERTICAL_CONFIGS).map(([key, cfg]) => (
                <option key={key} value={key} className="bg-[#0b0b0d] text-white">
                  {cfg.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        ) : (
          <div className="bg-[#171719] border border-[rgba(255,255,255,0.15)] px-3 py-2 text-[1.3rem] font-accent font-bold text-white uppercase flex items-center gap-2">
            {verticalIcons[currentVertical]}
            <span>{VERTICAL_CONFIGS[currentVertical]?.title || currentVertical}</span>
          </div>
        )}

        <div className="flex items-center gap-2 mt-2 text-[1.2rem] text-blue-300 font-medium">
          {verticalIcons[currentVertical]}
          <span>{VERTICAL_CONFIGS[currentVertical]?.title} Mode</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar__nav">
        {/* Super Admin Tenant Portal Link (Only for Super Admin) */}
        {isSuperAdmin && (
          <Link
            href="/super-admin"
            className={`sidebar__link bg-[#002bba]/20 border border-[#002bba]/50 text-blue-300 font-bold ${
              isActive("/super-admin") ? "sidebar__link--active" : ""
            }`}
          >
            <Building2 className="w-4 h-4 text-accent" />
            <span className="flex-1 truncate">Tenants & Access</span>
            <span className="sidebar__badge bg-accent text-white">SUPER</span>
          </Link>
        )}

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
          </div>
        )}

        {/* Hospital Management Section */}
        {currentVertical === "hospital" && (
          <div className="flex flex-col gap-1 mt-2">
            <div className="text-[1rem] font-accent uppercase text-cyan-400 font-bold px-3 py-1 tracking-wider">
              Hospital Operations
            </div>
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
          href="/staff"
          className={`sidebar__link mt-2 ${isActive("/staff") ? "sidebar__link--active" : ""}`}
        >
          <Users className="w-4 h-4 flex-shrink-0" />
          <span>Staff & Payroll</span>
        </Link>

        {/* Analytics */}
        <Link
          href="/reports"
          className={`sidebar__link ${isActive("/reports") ? "sidebar__link--active" : ""}`}
        >
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          <span>EOD & Sales Reports</span>
        </Link>
      </nav>

      {/* User Footer */}
      <div className="sidebar__user">
        <div className="sidebar__avatar avatar-round">
          <span>{userSession?.fullName ? userSession.fullName.slice(0, 2).toUpperCase() : "AA"}</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="sidebar__user-name truncate">
            {userSession?.fullName || "Active User"}
          </div>
          <div className="sidebar__user-role flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400 inline flex-shrink-0" />
            <span className="uppercase text-[1.05rem]">
              {userSession?.role ? userSession.role.replace("_", " ") : "USER"} / ACTIVE
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
