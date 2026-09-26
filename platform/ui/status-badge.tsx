import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "border-line-strong bg-canvas text-ink-muted",
  info: "border-[#c3d3ee] bg-accent-soft text-accent",
  success: "border-[#bcdcca] bg-success-soft text-success",
  warning: "border-[#ebd5a8] bg-warning-soft text-warning",
  danger: "border-[#eebfbd] bg-danger-soft text-danger",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-ink-subtle",
  info: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function StatusBadge({
  tone = "neutral",
  children,
  dot = true,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[3px] border px-1.5 py-0.5 text-[11px] font-medium leading-[16px] whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot ? (
        <span aria-hidden className={cn("size-1.5 rounded-full", DOT_CLASSES[tone])} />
      ) : null}
      {children}
    </span>
  );
}
