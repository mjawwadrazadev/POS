"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CursorStackEntry } from "@site/components/cursor/cursorTypes";

type CursorCtxValue = {
  push: (entry: CursorStackEntry) => void;
  pop: () => void;
  stack: CursorStackEntry[];
};

const CursorCtx = createContext<CursorCtxValue | null>(null);

export function CursorProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<CursorStackEntry[]>([]);

  const push = useCallback((entry: CursorStackEntry) => {
    setStack((s) => [...s, entry]);
  }, []);

  const pop = useCallback(() => {
    setStack((s) => s.slice(0, -1));
  }, []);

  const value = useMemo(
    () => ({ push, pop, stack }),
    [push, pop, stack],
  );

  return <CursorCtx.Provider value={value}>{children}</CursorCtx.Provider>;
}

export function useCursorInteraction(): CursorCtxValue {
  const ctx = useContext(CursorCtx);
  if (!ctx) {
    throw new Error("useCursorInteraction requires CursorProvider");
  }
  return ctx;
}

export function useCursorTop(): CursorStackEntry | null {
  const { stack } = useCursorInteraction();
  return stack.length ? stack[stack.length - 1]! : null;
}
