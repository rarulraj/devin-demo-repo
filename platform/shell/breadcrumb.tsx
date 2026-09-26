"use client";

import { usePathname } from "next/navigation";
import { NAV_APPS } from "../registry";

export function Breadcrumb() {
  const pathname = usePathname();
  const app =
    NAV_APPS.find((entry) => entry.href !== "/" && pathname.startsWith(entry.href)) ?? NAV_APPS[0];

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12.5px]">
      <span className="text-ink-subtle">Fintech Operations</span>
      <span aria-hidden className="text-ink-subtle">
        /
      </span>
      <span className="font-medium text-ink">{app.name}</span>
    </nav>
  );
}
