"use client";

import { useEffect, useRef } from "react";

/**
 * Moves keyboard focus into a detail drawer when it opens and hands it back to
 * the queue row that opened it on close. Rendered as the first child of the
 * drawer; `returnTo` is the query fragment of the originating row link.
 */
export function DrawerFocus({ returnTo }: { returnTo: string }) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const heading = marker.current?.parentElement?.querySelector<HTMLElement>("h2");
    heading?.focus();
    return () => {
      const row = document.querySelector<HTMLElement>(`a[href*="${returnTo}"]`);
      row?.focus();
    };
  }, [returnTo]);

  return <span ref={marker} hidden />;
}
