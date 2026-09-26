"use client";

import { ShieldAlert } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RefundDecision } from "@/lib/refunds/decisions";
import { Button } from "@/platform/ui/button";
import { ConfirmDialog } from "@/platform/ui/confirm-dialog";
import { submitRefundDecision } from "./actions";

type RefundDecisionButton = {
  decision: RefundDecision;
  label: string;
  title: string;
  description: string;
  deniedDescription: string;
  tone: "primary" | "danger";
  variant: "primary" | "danger";
  allowed: boolean;
};

export function RefundDecisionActions({
  refundId,
  summary,
  buttons,
  roleLabel,
  canDecide,
}: {
  refundId: string;
  summary: string;
  buttons: RefundDecisionButton[];
  roleLabel: string;
  canDecide: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function run(decision: RefundDecision, reason: string) {
    const result = await submitRefundDecision(refundId, decision, reason);
    if (!result.ok) return { ok: false, message: result.message };
    const params = new URLSearchParams(searchParams.toString());
    params.set("refund", refundId);
    params.set("done", decision);
    router.replace(`${pathname}?${params}`, { scroll: false });
    return { ok: true };
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => (
          <ConfirmDialog
            key={button.decision}
            title={button.allowed ? button.title : `${button.label} is not available`}
            description={
              button.allowed
                ? `${button.description} ${summary}.`
                : `${button.deniedDescription} ${summary}. ${roleLabel} is not authorized, so the platform refuses this operation and the request does not change.`
            }
            confirmLabel={button.allowed ? button.label : `Attempt ${button.label.toLowerCase()}`}
            tone={button.tone}
            reasonLabel="Decision reason"
            onConfirm={(reason) => run(button.decision, reason)}
            trigger={
              <Button variant={button.variant} size="md">
                {button.label}
              </Button>
            }
          />
        ))}
      </div>
      {canDecide ? null : (
        <p className="flex items-start gap-1.5 rounded-[3px] border border-line-strong bg-canvas px-2 py-1.5 text-[12.5px] text-ink-muted">
          <ShieldAlert aria-hidden className="mt-px size-3.5 shrink-0 text-ink-subtle" />
          <span>
            {roleLabel} cannot decide refunds. These actions stay clickable on purpose: the platform
            refuses the operation server-side and records the attempt in the audit log.
          </span>
        </p>
      )}
    </div>
  );
}
