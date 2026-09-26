import { AlertTriangle, Check, X } from "lucide-react";
import {
  CHECK_STATE_LABELS,
  RISK_LABELS,
  STATUS_LABELS,
  riskLevel,
  type CheckState,
  type KycCase,
  type KycStatus,
} from "@/lib/data/kyc-types";
import { StatusBadge, type StatusTone } from "@/platform/ui/status-badge";

const STATUS_TONES: Record<KycStatus, StatusTone> = {
  pending: "info",
  escalated: "warning",
  approved: "success",
  rejected: "danger",
};

export function StatusTag({ status }: { status: KycStatus }) {
  return <StatusBadge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</StatusBadge>;
}

/**
 * Risk is a number first and a label second: the score is what reviewers sort
 * and argue about, the band is only there to make scanning fast.
 */
export function RiskTag({ score }: { score: number }) {
  const level = riskLevel(score);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-[22px] text-right font-semibold text-ink tabular">{score}</span>
      <StatusBadge
        tone={level === "high" ? "danger" : level === "medium" ? "warning" : "neutral"}
        dot={false}
      >
        {RISK_LABELS[level]}
      </StatusBadge>
    </span>
  );
}

const CHECK_ICONS = {
  passed: { Icon: Check, className: "text-success" },
  failed: { Icon: X, className: "text-danger" },
  needs_review: { Icon: AlertTriangle, className: "text-warning" },
} as const;

export function CheckIcon({ state }: { state: CheckState }) {
  const { Icon, className } = CHECK_ICONS[state];
  return <Icon aria-hidden className={`size-3.5 shrink-0 ${className}`} strokeWidth={2.25} />;
}

export function checkSummary(kycCase: KycCase): { failed: number; review: number } {
  return {
    failed: kycCase.checks.filter((check) => check.state === "failed").length,
    review: kycCase.checks.filter((check) => check.state === "needs_review").length,
  };
}

/** Queue-level digest of the four checks, so a row explains itself. */
export function ChecksCell({ kycCase }: { kycCase: KycCase }) {
  const { failed, review } = checkSummary(kycCase);
  const label =
    failed > 0
      ? `${failed} failed${review > 0 ? `, ${review} to review` : ""}`
      : review > 0
        ? `${review} to review`
        : "All passed";

  return (
    <span className="inline-flex items-center gap-2" title={label}>
      <span className="inline-flex gap-1">
        {kycCase.checks.map((check) => (
          <span key={check.key} className="sr-only">
            {check.label}: {CHECK_STATE_LABELS[check.state]}.
          </span>
        ))}
        {kycCase.checks.map((check) => (
          <CheckIcon key={`${check.key}-icon`} state={check.state} />
        ))}
      </span>
      <span className={failed > 0 ? "text-danger" : review > 0 ? "text-ink" : "text-ink-muted"}>
        {label}
      </span>
    </span>
  );
}
