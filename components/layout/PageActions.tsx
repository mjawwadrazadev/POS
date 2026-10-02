"use client";

import { createContext, useContext } from "react";
import { createPortal } from "react-dom";

// The top bar owns the page title; each page sends its own buttons and status
// chips up into the bar's right side instead of drawing a second header.
export const TopBarSlotContext = createContext<HTMLElement | null>(null);

export function PageActions({ children }: { children: React.ReactNode }) {
  const slot = useContext(TopBarSlotContext);
  return slot ? createPortal(children, slot) : null;
}
