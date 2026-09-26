"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_APPS } from "../registry";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Applications" className="px-2 py-3">
      <p className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
        Applications
      </p>
      <ul className="space-y-0.5">
        {NAV_APPS.map((app) => {
          const active = app.href === "/" ? pathname === "/" : pathname.startsWith(app.href);
          const Icon = app.icon;
          return (
            <li key={app.id}>
              <Link
                href={app.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-[3px] px-2 py-1.5 text-[13px]",
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-ink-muted hover:bg-canvas hover:text-ink",
                )}
              >
                <Icon
                  aria-hidden
                  strokeWidth={1.75}
                  className={cn("size-4 shrink-0", active ? "text-accent" : "text-ink-subtle")}
                />
                <span className="truncate">{app.name}</span>
                {app.status === "not-implemented" ? (
                  <span
                    className="ml-auto rounded-[2px] border border-line-strong px-1 text-[10px] font-medium uppercase tracking-[0.04em] text-ink-subtle"
                    title="Not implemented in this build"
                  >
                    Soon
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
