import {
  LIMIT_REQUEST_STATUS_LABELS,
  type LimitRequestStatus,
} from "@/lib/data/limit-types";
import { StatusBadge, type StatusTone } from "@/platform/ui/status-badge";

const STATUS_TONES: Record<LimitRequestStatus, StatusTone> = {
  pending: "info",
  approved: "success",
  rejected: "danger",
};

export function LimitRequestTag({ status }: { status: LimitRequestStatus }) {
  return (
    <StatusBadge tone={STATUS_TONES[status]}>{LIMIT_REQUEST_STATUS_LABELS[status]}</StatusBadge>
  );
}
