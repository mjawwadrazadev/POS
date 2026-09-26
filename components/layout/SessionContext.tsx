"use client";

import { createContext, useContext } from "react";

// The signed-in user, loaded once by the dashboard layout and shared with every page below it
const SessionContext = createContext<any | null>(null);

export const SessionProvider = SessionContext.Provider;

export function useSessionUser(): any | null {
  return useContext(SessionContext);
}
