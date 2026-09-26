"use client";

import { useState } from "react";
import { LogOut, Eye, AlertTriangle } from "lucide-react";

interface ImpersonationBannerProps {
  tenantName: string;
}

export function ImpersonationBanner({ tenantName }: ImpersonationBannerProps) {
  const [exiting, setExiting] = useState(false);

  const handleExit = async () => {
    setExiting(true);
    try {
      const res = await fetch("/api/super-admin/impersonate/exit", {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));
      // On success we land back in the portal; if the window already expired the server
      // clears the cookie and asks for a fresh super admin login instead.
      window.location.href = data.redirectTo || (res.ok ? "/super-admin" : "/super-admin/login");
    } catch (err) {
      alert("Error exiting impersonation session");
      setExiting(false);
    }
  };

  return (
    <div className="bg-amber-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between font-medium text-sm sticky top-0 z-50 animate-pulse border-b border-amber-700">
      <div className="flex items-center space-x-2">
        <Eye className="w-5 h-5 text-amber-200" />
        <span>
          <strong>🎭 IMPERSONATION MODE ACTIVE:</strong> You are currently viewing the platform as <strong>{tenantName}</strong>.
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="bg-white text-amber-900 hover:bg-amber-50 px-3 py-1 rounded-md text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>{exiting ? "Exiting..." : "Exit to Platform HQ"}</span>
      </button>
    </div>
  );
}
