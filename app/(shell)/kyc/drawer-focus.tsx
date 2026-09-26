"use client";

import { useEffect, useRef } from "react";

/**
 * Moves keyboard focus into the case drawer when it opens and returns focus to
 * the originating queue row when it closes.
 */
export function DrawerFocus({ caseId }: { caseId: string }) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const heading = marker.current?.parentElement?.querySelector<HTMLElement>("h2");
    heading?.focus();
    return () => {
      const row = document.querySelector<HTMLElement>(`a[href*="case=${caseId}"]`);
      row?.focus();
    };
  }, [caseId]);

  return <span ref={marker} hidden />;
}
