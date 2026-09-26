"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, LifeBuoy, Plug, Plus, ShieldAlert } from "lucide-react";

interface SuperAdminHeaderProps {
  onOpenNewTenantModal: () => void;
}

export function SuperAdminHeader({ onOpenNewTenantModal }: SuperAdminHeaderProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard, exact: true },
    { label: "Tenants", href: "/super-admin/tenants", icon: Building2, exact: false },
    { label: "Support Tickets", href: "/super-admin/support", icon: LifeBuoy, exact: false },
    { label: "Integrations", href: "/super-admin/integrations", icon: Plug, exact: false },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand / Title */}
        <div className="flex items-center space-x-6">
          <Link href="/super-admin" className="flex items-center space-x-2.5">
            <div className="bg-blue-600 p-2 rounded-lg text-white font-bold tracking-tight flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white">RST POS</span>
              <span className="ml-2 text-xs font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 uppercase tracking-wider">
                PLATFORM HQ
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: + New Tenant Action Button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenNewTenantModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center space-x-2 transition shadow-md hover:shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Tenant</span>
          </button>
        </div>
      </div>
    </header>
  );
}
