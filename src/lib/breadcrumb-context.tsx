"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type BreadcrumbContextType = {
  /** Map of raw URL segment → human-readable label override */
  labelOverrides: Map<string, string>;
  /** Register a display label for a raw URL segment (e.g. a UUID → candidate name) */
  overrideLabel: (segment: string, label: string) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextType | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [labelOverrides, setLabelOverrides] = useState<Map<string, string>>(
    new Map()
  );

  const overrideLabel = useCallback((segment: string, label: string) => {
    setLabelOverrides((prev) => {
      const next = new Map(prev);
      next.set(segment, label);
      return next;
    });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ labelOverrides, overrideLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/**
 * Hook to read/write breadcrumb label overrides.
 * Returns a no-op stub when used outside <BreadcrumbProvider> so Header
 * degrades gracefully without throwing.
 */
export function useBreadcrumb(): BreadcrumbContextType {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) {
    return {
      labelOverrides: new Map(),
      overrideLabel: () => {},
    };
  }
  return ctx;
}