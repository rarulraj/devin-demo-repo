"use client";

import { ShieldAlert } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MAX_LIMIT_MINOR, MIN_LIMIT_MINOR, formatLimit } from "@/lib/data/limit-types";
import type { LimitDecision } from "@/lib/limits/requests";
import { Button } from "@/platform/ui/button";
import { ConfirmDialog } from "@/platform/ui/confirm-dialog";
import { submitLimitDecision, submitLimitRequest } from "./actions";

/**
 * Two different operations on one account, split by authorization rather than
 * by screen: anyone reviewing accounts may ask for a new daily limit, and only
 * an approver may decide an open request.
 */
export function LimitControls({
  accountId,
  accountLabel,
  currentLimitMinor,
  pending,
  roleLabel,
  canRequest,
  canApprove,
  canReject,
}: {
  accountId: string;
  accountLabel: string;
  currentLimitMinor: number;
  pending?: { id: string; requestedLimitMinor: number };
  roleLabel: string;
  canRequest: boolean;
  canApprove: boolean;
  canReject: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [target, setTarget] = useState(String(currentLimitMinor / 100));

  /** `ref` is what the audit entry is filed under, so the success link finds it. */
  function finish(done: string, ref: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("account", accountId);
    params.set("done", done);
    params.set("ref", ref);
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  async function request(justification: string) {
    const minor = Math.round(Number(target) * 100);
    if (!Number.isFinite(minor)) {
      return { ok: false, message: "Enter a daily limit as a number." };
    }
    const result = await submitLimitRequest(accountId, minor, justification);
    if (!result.ok) return { ok: false, message: result.message };
    finish("request", accountId);
    return { ok: true };
  }

  async function decide(decision: LimitDecision, reason: string) {
    if (!pending) return { ok: false, message: "There is no open request to decide." };
    const result = await submitLimitDecision(pending.id, decision, reason);
    if (!result.ok) return { ok: false, message: result.message };
    finish(decision, pending.id);
    return { ok: true };
  }

  const deniedSuffix = `${roleLabel} is not authorized, so the platform refuses this operation and nothing changes.`;

  return (
    <div className="space-y-2.5">
      {pending ? (
        <div className="flex flex-wrap gap-2">
          <ConfirmDialog
            title={canApprove ? `Approve ${pending.id}` : "Approve is not available"}
            description={
              canApprove
                ? `The daily limit for ${accountLabel} moves from ${formatLimit(currentLimitMinor)} to ${formatLimit(pending.requestedLimitMinor)}.`
                : `Approving ${pending.id} would raise the recorded daily limit for ${accountLabel}. ${deniedSuffix}`
            }
            confirmLabel={canApprove ? "Approve request" : "Attempt approval"}
            reasonLabel="Decision reason"
            onConfirm={(reason) => decide("approve", reason)}
            trigger={
              <Button variant="primary" size="md">
                Approve
              </Button>
            }
          />
          <ConfirmDialog
            title={canReject ? `Reject ${pending.id}` : "Reject is not available"}
            description={
              canReject
                ? `${accountLabel} keeps its current daily limit of ${formatLimit(currentLimitMinor)}.`
                : `Rejecting ${pending.id} would close the open request for ${accountLabel}. ${deniedSuffix}`
            }
            confirmLabel={canReject ? "Reject request" : "Attempt rejection"}
            tone="danger"
            reasonLabel="Decision reason"
            onConfirm={(reason) => decide("reject", reason)}
            trigger={
              <Button variant="danger" size="md">
                Reject
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[12px] font-medium text-ink">
            <span className="block">New daily limit (£)</span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_LIMIT_MINOR / 100}
              max={MAX_LIMIT_MINOR / 100}
              step={500}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="mt-1 w-[140px] rounded-[3px] border border-line-strong bg-surface px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
          <ConfirmDialog
            title={canRequest ? `Request a limit change for ${accountLabel}` : "Requests are not available"}
            description={
              canRequest
                ? `This records a request to move the daily limit from ${formatLimit(currentLimitMinor)}. The limit does not change until an approver decides the request.`
                : `A limit-change request for ${accountLabel} would be recorded for approval. ${deniedSuffix}`
            }
            confirmLabel={canRequest ? "Submit request" : "Attempt request"}
            reasonLabel="Justification"
            onConfirm={request}
            trigger={
              <Button variant="primary" size="md">
                Request change
              </Button>
            }
          />
        </div>
      )}

      {pending && !canApprove ? (
        <p className="flex items-start gap-1.5 rounded-[3px] border border-line-strong bg-canvas px-2 py-1.5 text-[12.5px] text-ink-muted">
          <ShieldAlert aria-hidden className="mt-px size-3.5 shrink-0 text-ink-subtle" />
          <span>
            {canRequest
              ? `${roleLabel} may request limit changes but cannot decide them.`
              : `${roleLabel} cannot change transaction limits.`}{" "}
            These actions stay clickable on purpose: the platform refuses the operation server-side
            and records the attempt in the audit log.
          </span>
        </p>
      ) : null}

      {!pending && !canRequest ? (
        <p className="flex items-start gap-1.5 rounded-[3px] border border-line-strong bg-canvas px-2 py-1.5 text-[12.5px] text-ink-muted">
          <ShieldAlert aria-hidden className="mt-px size-3.5 shrink-0 text-ink-subtle" />
          <span>
            {roleLabel} cannot request limit changes. This control stays clickable on purpose: the
            platform refuses the operation server-side and records the attempt in the audit log.
          </span>
        </p>
      ) : null}
    </div>
  );
}
