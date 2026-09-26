import { applyKycDecision, getKycCase } from "@/lib/data/kyc-store";
import type { KycCase, KycStatus } from "@/lib/data/kyc-types";
import type { AuditEvent } from "@/platform/audit";
import { mutate } from "@/platform/mutate";
import type { Permission } from "@/platform/rbac";
import { getSession } from "@/platform/session";

export type KycDecision = "approve" | "reject" | "escalate";

type DecisionSpec = {
  action: string;
  permission: Permission;
  status: KycStatus;
};

export const KYC_DECISIONS: Record<KycDecision, DecisionSpec> = {
  approve: { action: "Approve KYC case", permission: "kyc.approve", status: "approved" },
  reject: { action: "Reject KYC case", permission: "kyc.reject", status: "rejected" },
  escalate: { action: "Escalate KYC case", permission: "kyc.escalate", status: "escalated" },
};

export const MIN_REASON_LENGTH = 3;

export type DecisionResult =
  | { ok: true; case: KycCase; event: AuditEvent }
  | { ok: false; error: string };

/**
 * The only way a KYC case changes state.
 *
 * This function describes the operation; the platform resolves who is acting,
 * authorizes them, runs the state change and records the audit entry. There is
 * no KYC-specific authorization or audit code anywhere in this application.
 */
export async function decideKycCase(input: {
  caseId: string;
  decision: KycDecision;
  reason: string;
}): Promise<DecisionResult> {
  const spec = KYC_DECISIONS[input.decision];
  if (!spec) return { ok: false, error: "Unknown decision" };

  const reason = input.reason.trim();
  if (reason.length < MIN_REASON_LENGTH) {
    return { ok: false, error: "A reason is required and is stored on the audit record." };
  }

  const current = getKycCase(input.caseId);
  if (!current) return { ok: false, error: `Unknown KYC case ${input.caseId}` };

  // Read-only: the note needs an author. Authorization still resolves its own
  // actor inside mutate(), so nothing here can change who the platform thinks
  // is acting.
  const reviewer = await getSession();

  const result = await mutate({
    app: "kyc",
    action: spec.action,
    permission: spec.permission,
    entity: `kyc_case:${current.id}`,
    entityLabel: `${current.id} · ${current.customer}`,
    reason,
    before: current.status,
    after: spec.status,
    apply: () =>
      applyKycDecision(current.id, spec.status, {
        author: reviewer.name,
        at: new Date().toISOString(),
        text: reason,
      }),
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, case: result.data, event: result.event };
}
