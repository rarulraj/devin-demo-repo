import { applyRefundDecision, getRefund } from "@/lib/data/refund-store";
import { formatAmount, type RefundRequest, type RefundStatus } from "@/lib/data/refund-types";
import type { AuditEvent } from "@/platform/audit";
import { mutate } from "@/platform/mutate";
import type { Permission } from "@/platform/rbac";
import { getSession } from "@/platform/session";

export type RefundDecision = "approve" | "reject";

type DecisionSpec = {
  action: string;
  permission: Permission;
  status: RefundStatus;
};

export const REFUND_DECISIONS: Record<RefundDecision, DecisionSpec> = {
  approve: { action: "Approve refund", permission: "refund.approve", status: "approved" },
  reject: { action: "Reject refund", permission: "refund.reject", status: "rejected" },
};

export const MIN_REASON_LENGTH = 3;

export type RefundDecisionResult =
  | { ok: true; refund: RefundRequest; event: AuditEvent }
  | { ok: false; error: string };

/**
 * The only way a refund changes state.
 *
 * Identical shape to the KYC decision path on purpose: the application
 * describes the operation, the platform resolves the actor, authorizes it,
 * applies the change and records the audit entry.
 */
export async function decideRefund(input: {
  refundId: string;
  decision: RefundDecision;
  reason: string;
}): Promise<RefundDecisionResult> {
  const spec = REFUND_DECISIONS[input.decision];
  if (!spec) return { ok: false, error: "Unknown decision" };

  const reason = input.reason.trim();
  if (reason.length < MIN_REASON_LENGTH) {
    return { ok: false, error: "A reason is required and is stored on the audit record." };
  }

  const current = getRefund(input.refundId);
  if (!current) return { ok: false, error: `Unknown refund ${input.refundId}` };

  // Read-only: the note needs an author. Authorization still resolves its own
  // actor inside mutate().
  const operator = await getSession();

  const result = await mutate({
    app: "refunds",
    action: spec.action,
    permission: spec.permission,
    entity: `refund:${current.id}`,
    entityLabel: `${current.id} · ${formatAmount(current.amountMinor)}`,
    reason,
    before: current.status,
    after: spec.status,
    apply: () =>
      applyRefundDecision(current.id, spec.status, {
        author: operator.name,
        at: new Date().toISOString(),
        text: reason,
      }),
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, refund: result.data, event: result.event };
}
