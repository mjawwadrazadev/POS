import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RST POS — NIB IT Universal Point of Sale Platform",
  description: "Single-codebase, multi-tenant, multi-vertical enterprise POS platform built for high reliability and fast checkout.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" color-scheme="light">
      <body>{children}</body>
    </html>
  );
}
