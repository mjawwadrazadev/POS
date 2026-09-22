"use client";

import { useEffect, useState } from "react";
import { usePosStore } from "@/lib/store/usePosStore";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";
import {
  Search,
  Building2,
  ShieldCheck,
} from "lucide-react";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title = "POS Control Center" }: TopBarProps) {
  const { currentVertical, selectedBranch, activeShiftOpen, toggleShift } = usePosStore();
  const [userSession, setUserSession] = useState<any | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUserSession(data.user);
        }
      } catch (e) {
        console.error("TopBar session fetch failed:", e);
      }
    }
    fetchSession();
  }, []);

  const verticalConfig = VERTICAL_CONFIGS[currentVertical];
  const isSuperAdmin = userSession?.role === "super_admin";

  const branchDisplayText = isSuperAdmin
    ? "RST POS PLATFORM HQ (GLOBAL SUPER ADMIN)"
    : userSession?.branchName || userSession?.organizationName || selectedBranch || "MAIN BRANCH";

  return (
    <header className="topbar">
      {/* Left side title and active vertical tag */}
      <div className="topbar__left">
        <div>
          <h1 className="topbar__title">{title}</h1>
          <div className="flex items-center gap-3 mt-1 text-[1.2rem] text-muted font-medium">
            <span className="flex items-center gap-1.5 text-accent font-accent font-semibold">
              {isSuperAdmin ? (
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Building2 className="w-3.5 h-3.5" />
              )}
              <span>{branchDisplayText}</span>
            </span>
            <span>•</span>
            <span className="text-bright font-accent font-semibold uppercase">
              {verticalConfig.title}
            </span>
          </div>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="hidden md:flex items-center gap-2 bg-base-tint border border-stroke-muted px-4 py-2 w-80">
        <Search className="w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search products, orders (Ctrl+K)..."
          className="bg-transparent text-[1.3rem] text-bright outline-none w-full font-sans"
        />
        <span className="font-accent text-[1rem] bg-base-bright px-1.5 py-0.5 border border-stroke-muted text-muted">
          ⌘K
        </span>
      </div>

      {/* Right side actions */}
      <div className="topbar__actions">
        {/* Shift Control Button (Only relevant for store cashiers/managers) */}
        {!isSuperAdmin && (
          <button
            type="button"
            onClick={toggleShift}
            className={`btn ${
              activeShiftOpen ? "btn-success" : "btn-danger"
            } py-2 px-3 text-[1.2rem] flex items-center gap-2`}
          >
            <span>{activeShiftOpen ? "SHIFT OPEN" : "SHIFT CLOSED"}</span>
          </button>
        )}
      </div>
    </header>
  );
}
