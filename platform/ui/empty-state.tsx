import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {Icon ? <Icon aria-hidden className="size-5 text-ink-subtle" strokeWidth={1.75} /> : null}
      <p className="text-[13px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-[12.5px] text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
