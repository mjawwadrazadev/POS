"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ImpersonationBanner } from "@/components/super-admin/ImpersonationBanner";
import { AnnouncementBanner } from "@/components/super-admin/AnnouncementBanner";

function superAdminTitle(pathname: string) {
  if (pathname.startsWith("/super-admin/tenants/")) return "Tenant Details";
  if (pathname.startsWith("/super-admin/tenants")) return "Tenants & Subscriptions";
  if (pathname.startsWith("/super-admin/support")) return "Support Desk";
  if (pathname.startsWith("/super-admin/integrations")) return "Platform Integrations";
  return "Platform Command Center";
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

        const isSuperAdminOrSupport = data.user.role === "super_admin" || data.user.role === "platform_support";

        // If trying to access /super-admin page as non-super_admin/platform_support -> redirect to home
        if (pathname.startsWith("/super-admin") && !isSuperAdminOrSupport) {
          router.replace("/");
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
  const topBarTitle = isSuperAdminRoute ? superAdminTitle(pathname) : undefined;

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
          <TopBar title={topBarTitle} session={userSession} />
          <main className="pos-main__content">{children}</main>
        </div>
      </div>
    </div>
  );
}
