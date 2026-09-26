import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-[4px] border border-line bg-surface", className)}>
      {title ? (
        <div className="flex items-start justify-between gap-3 px-4 py-2.5">
          <div>
            <h2 className="text-[13px] font-semibold tracking-[-0.005em] text-ink">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[12.5px] text-ink-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
