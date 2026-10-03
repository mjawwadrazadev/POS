"use client";

import { usePosStore } from "@/lib/store/usePosStore";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";
import { isPlatformRole } from "@/lib/auth/permissions";
import { Building2, Menu, ShieldCheck } from "lucide-react";

interface TopBarProps {
  title: string;
  // Session loaded once by the dashboard layout
  session: any;
  // Where pages render their own buttons through <PageActions>
  actionsRef: (el: HTMLDivElement | null) => void;
  sidebarOpen: boolean;
  // Opens the drawer on phones, collapses / expands the sidebar on tablets and desktops
  onMenuClick: () => void;
}

export function TopBar({ title, session: userSession, actionsRef, sidebarOpen, onMenuClick }: TopBarProps) {
  const { currentVertical, selectedBranch } = usePosStore();

  const verticalConfig = VERTICAL_CONFIGS[currentVertical];
  const isSuperAdmin = isPlatformRole(userSession?.role) && !userSession?.isImpersonating;

  const branchDisplayText = isSuperAdmin
    ? "RST POS PLATFORM HQ"
    : userSession?.branchName || userSession?.organizationName || selectedBranch || "MAIN BRANCH";

  return (
    <header className="topbar">
      <div className="topbar__left min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="topbar__menu"
          aria-label={sidebarOpen ? "Hide menu" : "Show menu"}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          title={sidebarOpen ? "Hide menu" : "Show menu"}
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="topbar__title truncate" title={title}>{title}</h1>
          {/* One line: the branch name shortens with "…" instead of wrapping onto several lines */}
          <div className="topbar__meta flex items-center gap-x-3 mt-1 text-[1.2rem] text-muted font-medium whitespace-nowrap min-w-0">
            <span className="flex items-center gap-1.5 text-accent font-accent font-semibold min-w-0" title={branchDisplayText}>
              {isSuperAdmin ? (
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Building2 className="w-3.5 h-3.5" />
              )}
              <span className="truncate">{branchDisplayText}</span>
            </span>
            {userSession && !isSuperAdmin && (
              <>
                <span className="flex-shrink-0">•</span>
                <span className="text-bright font-accent font-semibold uppercase flex-shrink-0">
                  {verticalConfig.title}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div ref={actionsRef} className="topbar__actions" />
    </header>
  );
}
