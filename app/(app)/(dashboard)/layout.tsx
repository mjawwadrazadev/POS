"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { TopBarSlotContext } from "@/components/layout/PageActions";
import { SessionProvider } from "@/components/layout/SessionContext";
import { ImpersonationBanner } from "@/components/super-admin/ImpersonationBanner";
import { AnnouncementBanner } from "@/components/super-admin/AnnouncementBanner";
import { isPlatformRole } from "@/lib/auth/permissions";

function superAdminTitle(pathname: string) {
  if (pathname.startsWith("/super-admin/tenants/")) return "Tenant Details";
  if (pathname.startsWith("/super-admin/tenants")) return "Tenants & Subscriptions";
  if (pathname.startsWith("/super-admin/support")) return "Support Desk";
  if (pathname.startsWith("/super-admin/integrations")) return "Platform Integrations";
  if (pathname.startsWith("/super-admin/users")) return "User Management";
  if (pathname.startsWith("/super-admin/agents")) return "Agent Performance";
  if (pathname.startsWith("/super-admin/agent")) return "Demo Desk";
  if (pathname.startsWith("/super-admin/leads")) return "Website Leads";
  return "Platform Command Center";
}

// Same names as the sidebar, so the header always says which page is open
const STORE_TITLES: [string, string][] = [
  ["/dashboard", "Dashboard"],
  ["/pos", "POS Billing"],
  ["/orders", "Orders & Receipts"],
  ["/kds", "Kitchen Display"],
  ["/consultations", "Consultation Billing"],
  ["/doctors", "Doctor Directory"],
  ["/reports/doctors", "Doctor Revenue Reports"],
  ["/reports", "EOD & Sales Reports"],
  ["/products", "Products & SKUs"],
  ["/inventory/stock", "Stock Transfers"],
  ["/accounting/ledger", "Double-Entry Ledger"],
  ["/hr", "Attendance & Payroll"],
  ["/settings/team", "Team, Branches & Tables"],
  ["/settings/printers", "Printers & Scanners"],
  ["/support", "Support Desk"],
];

function storeTitle(pathname: string) {
  const match = STORE_TITLES.find(([path]) => pathname === path || pathname.startsWith(path + "/"));
  return match ? match[1] : "Dashboard";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!res.ok || !data.authenticated || !data.user) {
          const targetLogin = pathname.startsWith("/super-admin") ? "/super-admin/login" : "/login";
          router.replace(targetLogin);
          return;
        }

        const isPlatformStaff = isPlatformRole(data.user.role) && !data.user.isImpersonating;

        // If trying to access /super-admin page as a store user -> redirect to home
        if (pathname.startsWith("/super-admin") && !isPlatformStaff) {
          router.replace("/dashboard");
          return;
        }

        setUserSession(data.user);
        setAuthenticated(true);
      } catch (err) {
        console.error("Dashboard auth check failed:", err);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-[1.2rem] font-accent text-gray-400">Verifying Security Session...</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const topBarTitle = isSuperAdminRoute ? superAdminTitle(pathname) : storeTitle(pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Impersonation Banner if super admin is impersonating a tenant */}
      {userSession?.isImpersonating && (
        <ImpersonationBanner tenantName={userSession.targetOrgName || userSession.orgName || "Tenant"} />
      )}

      {/* Announcement Banner for tenant view */}
      {!isSuperAdminRoute && <AnnouncementBanner />}

      {/* Main App Layout */}
      <div className="pos-layout">
        <Sidebar session={userSession} />
        <div className="pos-main">
          <TopBarSlotContext.Provider value={actionsSlot}>
            <TopBar title={topBarTitle} session={userSession} actionsRef={setActionsSlot} />
            <main className="pos-main__content">
              <SessionProvider value={userSession}>{children}</SessionProvider>
            </main>
          </TopBarSlotContext.Provider>
        </div>
      </div>
    </div>
  );
}
