import { REFUND_STATUS_LABELS, type RefundStatus } from "@/lib/data/refund-types";
import { StatusBadge, type StatusTone } from "@/platform/ui/status-badge";

const STATUS_TONES: Record<RefundStatus, StatusTone> = {
  pending: "info",
  approved: "success",
  rejected: "danger",
};

export function RefundStatusTag({ status }: { status: RefundStatus }) {
  return <StatusBadge tone={STATUS_TONES[status]}>{REFUND_STATUS_LABELS[status]}</StatusBadge>;
}
