"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pos-layout">
      <Sidebar />
      <div className="pos-main">
        <TopBar />
        <main className="pos-main__content">{children}</main>
      </div>
    </div>
  );
}
