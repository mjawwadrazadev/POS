"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Eye, AlertTriangle } from "lucide-react";

interface ImpersonationBannerProps {
  tenantName: string;
}

export function ImpersonationBanner({ tenantName }: ImpersonationBannerProps) {
  const [exiting, setExiting] = useState(false);
  const router = useRouter();

  const handleExit = async () => {
    setExiting(true);
    try {
      const res = await fetch("/api/super-admin/impersonate/exit", {
        method: "POST",
      });

      if (res.ok) {
        window.location.href = "/super-admin";
      } else {
        alert("Failed to exit impersonation session");
        setExiting(false);
      }
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
