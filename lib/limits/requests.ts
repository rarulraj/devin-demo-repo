import {
  addLimitRequest,
  applyLimitDecision,
  getAccount,
  getRequest,
} from "@/lib/data/limit-store";
import {
  MAX_LIMIT_MINOR,
  MIN_LIMIT_MINOR,
  formatLimit,
  isPendingRequest,
  type LimitRequest,
} from "@/lib/data/limit-types";
import type { AuditEvent } from "@/platform/audit";
import { mutate } from "@/platform/mutate";
import type { Permission } from "@/platform/rbac";
import { getSession } from "@/platform/session";

/**
 * Limits have two operations with different authorization: anyone who reviews
 * accounts may ask for a limit change, but only an approver may grant it. Both
 * go through the same shared mutation path, so the split lives in the
 * permission each operation declares, not in a second authorization mechanism.
 */

export const MIN_REASON_LENGTH = 3;

export type LimitDecision = "approve" | "reject";

type DecisionSpec = {
  action: string;
  permission: Permission;
  status: Exclude<LimitRequest["status"], "pending">;
};

export const LIMIT_DECISIONS: Record<LimitDecision, DecisionSpec> = {
  approve: {
    action: "Approve limit change",
    permission: "limit.approve",
    status: "approved",
  },
  reject: {
    action: "Reject limit change",
    permission: "limit.reject",
    status: "rejected",
  },
};

export type LimitRequestResult =
  | { ok: true; request: LimitRequest; event: AuditEvent }
  | { ok: false; error: string };

function checkReason(reason: string): string | undefined {
  return reason.length < MIN_REASON_LENGTH
    ? "A reason is required and is stored on the audit record."
    : undefined;
}

/** Raise a request to move an account's daily limit. Does not change the limit. */
export async function requestLimitChange(input: {
  accountId: string;
  requestedLimitMinor: number;
  justification: string;
}): Promise<LimitRequestResult> {
  const justification = input.justification.trim();
  const invalid = checkReason(justification);
  if (invalid) return { ok: false, error: invalid };

  const account = getAccount(input.accountId);
  if (!account) return { ok: false, error: `Unknown account ${input.accountId}` };

  const requested = input.requestedLimitMinor;
  if (!Number.isInteger(requested) || requested < MIN_LIMIT_MINOR || requested > MAX_LIMIT_MINOR) {
    return {
      ok: false,
      error: `Enter a daily limit between ${formatLimit(MIN_LIMIT_MINOR)} and ${formatLimit(MAX_LIMIT_MINOR)}.`,
    };
  }
  if (requested === account.dailyLimitMinor) {
    return { ok: false, error: "That is already the current daily limit." };
  }

  // Read-only: the request needs a requester. mutate() still resolves its own
  // actor for authorization and the audit entry.
  const operator = await getSession();

  const result = await mutate({
    app: "limits",
    action: "Request limit change",
    permission: "limit.request",
    entity: `account:${account.id}`,
    entityLabel: `${account.id} · ${account.customer}`,
    reason: justification,
    before: formatLimit(account.dailyLimitMinor),
    after: `${formatLimit(requested)} requested`,
    apply: () =>
      addLimitRequest({
        accountId: account.id,
        requestedLimitMinor: requested,
        requestedBy: operator.name,
        requestedAt: new Date().toISOString(),
        justification,
      }),
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, request: result.data, event: result.event };
}

/** Approve or reject an open request. Approval is what moves the limit. */
export async function decideLimitRequest(input: {
  requestId: string;
  decision: LimitDecision;
  reason: string;
}): Promise<LimitRequestResult> {
  const spec = LIMIT_DECISIONS[input.decision];
  if (!spec) return { ok: false, error: "Unknown decision" };

  const reason = input.reason.trim();
  const invalid = checkReason(reason);
  if (invalid) return { ok: false, error: invalid };

  const current = getRequest(input.requestId);
  if (!current) return { ok: false, error: `Unknown limit request ${input.requestId}` };
  if (!isPendingRequest(current)) {
    return { ok: false, error: `${current.id} was already ${current.status}.` };
  }

  const account = getAccount(current.accountId);
  const operator = await getSession();

  const result = await mutate({
    app: "limits",
    action: spec.action,
    permission: spec.permission,
    entity: `limit_request:${current.id}`,
    entityLabel: `${current.id} · ${account?.customer ?? current.accountId} · ${formatLimit(current.requestedLimitMinor)}`,
    reason,
    before: formatLimit(current.previousLimitMinor),
    after:
      spec.status === "approved"
        ? formatLimit(current.requestedLimitMinor)
        : `${formatLimit(current.previousLimitMinor)} (request rejected)`,
    apply: () =>
      applyLimitDecision(current.id, spec.status, {
        author: operator.name,
        at: new Date().toISOString(),
        text: reason,
      }),
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, request: result.data, event: result.event };
}
