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

const MOBILE_QUERY = "(max-width: 767.98px)";
const SIDEBAR_COLLAPSED_KEY = "rst_pos_sidebar_collapsed";

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

  // Phones get the sidebar as a slide-in drawer (closed by default). Tablets and desktops keep it
  // open, with the same menu button to collapse it; that choice is remembered on the device.
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => {
      setIsMobile(mq.matches);
      setDrawerOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      // storage unavailable — sidebar just starts open
    }
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Close the drawer after navigating, and on Escape
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  function toggleSidebar() {
    if (isMobile) {
      setDrawerOpen((open) => !open);
      return;
    }
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, c ? "0" : "1");
      } catch {
        // ignore
      }
      return !c;
    });
  }

  // Load the session once. Moving between pages keeps it: middleware re-checks the token on every
  // navigation and every API call re-verifies against the database, so refetching here only adds a round trip.
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!res.ok || !data.authenticated || !data.user) {
          const targetLogin = window.location.pathname.startsWith("/super-admin") ? "/super-admin/login" : "/login";
          router.replace(targetLogin);
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
  }, [router]);

  // Store users who reach a /super-admin page go back to their dashboard
  const isPlatformStaff = isPlatformRole(userSession?.role) && !userSession?.isImpersonating;
  const blockedSuperAdminPage = authenticated && pathname.startsWith("/super-admin") && !isPlatformStaff;
  useEffect(() => {
    if (blockedSuperAdminPage) router.replace("/dashboard");
  }, [blockedSuperAdminPage, router]);

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

  if (!authenticated || blockedSuperAdminPage) {
    return null;
  }

  const isSuperAdminRoute = pathname.startsWith("/super-admin");
  const topBarTitle = isSuperAdminRoute ? superAdminTitle(pathname) : storeTitle(pathname);
  const sidebarHidden = isMobile ? !drawerOpen : collapsed;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Impersonation Banner if super admin is impersonating a tenant */}
      {userSession?.isImpersonating && (
        <ImpersonationBanner tenantName={userSession.targetOrgName || userSession.orgName || "Tenant"} />
      )}

      {/* Announcement Banner for tenant view */}
      {!isSuperAdminRoute && <AnnouncementBanner />}

      {/* Main App Layout */}
      <div
        className={`pos-layout ${collapsed ? "pos-layout--collapsed" : ""} ${drawerOpen ? "pos-layout--drawer-open" : ""}`}
      >
        <Sidebar
          session={userSession}
          hidden={sidebarHidden}
          onClose={() => setDrawerOpen(false)}
          onNavigate={() => setDrawerOpen(false)}
        />
        {isMobile && drawerOpen && (
          <div className="sidebar-backdrop" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
        )}
        <div className="pos-main">
          <TopBarSlotContext.Provider value={actionsSlot}>
            <TopBar
              title={topBarTitle}
              session={userSession}
              actionsRef={setActionsSlot}
              sidebarOpen={!sidebarHidden}
              onMenuClick={toggleSidebar}
            />
            <main className="pos-main__content">
              <SessionProvider value={userSession}>{children}</SessionProvider>
            </main>
          </TopBarSlotContext.Provider>
        </div>
      </div>
    </div>
  );
}
