"use client";

import { ShieldAlert } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { KycDecision } from "@/lib/kyc/decisions";
import { Button } from "@/platform/ui/button";
import { ConfirmDialog } from "@/platform/ui/confirm-dialog";
import { submitKycDecision } from "./actions";

type DecisionButton = {
  decision: KycDecision;
  label: string;
  title: string;
  description: string;
  deniedDescription: string;
  tone: "primary" | "danger";
  variant: "primary" | "secondary" | "danger";
  allowed: boolean;
  warning?: string;
  acknowledgeLabel?: string;
};

export function DecisionActions({
  caseId,
  customer,
  buttons,
  roleLabel,
  canDecide,
}: {
  caseId: string;
  customer: string;
  buttons: DecisionButton[];
  roleLabel: string;
  canDecide: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  async function run(decision: KycDecision, reason: string) {
    const result = await submitKycDecision(caseId, decision, reason);
    if (!result.ok) return { ok: false, message: result.message };
    const params = new URLSearchParams(searchParams.toString());
    params.set("case", caseId);
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
                ? `${button.description} ${caseId} · ${customer}.`
                : `${button.deniedDescription} ${caseId} · ${customer}. ${roleLabel} is not authorized, so the platform refuses this operation and the case does not change.`
            }
            confirmLabel={button.allowed ? button.label : `Attempt ${button.label.toLowerCase()}`}
            tone={button.tone}
            reasonLabel="Reviewer note"
            warning={button.allowed ? button.warning : undefined}
            acknowledgeLabel={button.allowed ? button.acknowledgeLabel : undefined}
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
            {roleLabel} cannot decide cases. These actions stay clickable on purpose: the platform
            refuses the operation server-side and records the attempt in the audit log.
          </span>
        </p>
      )}
    </div>
  );
}
