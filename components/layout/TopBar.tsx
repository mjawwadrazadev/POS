"use client";

import { useEffect, useState } from "react";
import { usePosStore } from "@/lib/store/usePosStore";
import { VERTICAL_CONFIGS } from "@/lib/config/verticals";
import {
  MapPin,
  Search,
  Moon,
  Sun,
  Lock,
  Unlock,
  Building2,
} from "lucide-react";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title = "POS Control Center" }: TopBarProps) {
  const { currentVertical, selectedBranch, activeShiftOpen, toggleShift } = usePosStore();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    document.documentElement.setAttribute("color-scheme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  const verticalConfig = VERTICAL_CONFIGS[currentVertical];

  return (
    <header className="topbar">
      {/* Left side title and active vertical tag */}
      <div className="topbar__left">
        <div>
          <h1 className="topbar__title">{title}</h1>
          <div className="flex items-center gap-3 mt-1 text-[1.2rem] text-muted font-medium">
            <span className="flex items-center gap-1 text-accent font-accent font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              {selectedBranch}
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
        {/* Shift Control Button */}
        <button
          type="button"
          onClick={toggleShift}
          className={`btn ${
            activeShiftOpen ? "btn-success" : "btn-danger"
          } py-2 px-3 text-[1.2rem] flex items-center gap-2`}
        >
          {activeShiftOpen ? (
            <>
              <Unlock className="w-3.5 h-3.5" />
              <span>Shift Open</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Shift Closed</span>
            </>
          )}
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="btn btn-secondary py-2 px-3 text-[1.2rem] flex items-center gap-2"
          title="Toggle Light / Dark Theme"
        >
          {theme === "light" ? (
            <>
              <Moon className="w-4 h-4 text-slate-700" />
              <span className="hidden sm:inline font-accent">Dark</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline font-accent">Light</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
