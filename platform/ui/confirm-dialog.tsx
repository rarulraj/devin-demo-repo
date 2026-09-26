"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { useId, useState, useTransition, type ReactNode } from "react";
import { Button } from "./button";

export type ConfirmResult = { ok: boolean; message?: string };

/**
 * Shared confirmation step for privileged actions.
 * Reason capture is wired here so every audited action can carry justification
 * without each application reinventing the flow.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  tone = "primary",
  requireReason = true,
  reasonLabel = "Reason",
  warning,
  acknowledgeLabel,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  requireReason?: boolean;
  reasonLabel?: string;
  warning?: string;
  acknowledgeLabel?: string;
  onConfirm: (reason: string) => Promise<ConfirmResult>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const acknowledgeId = useId();

  function submit() {
    if (acknowledgeLabel && !acknowledged) {
      setError("Confirm the unresolved verification checks before continuing.");
      return;
    }
    if (requireReason && reason.trim().length < 3) {
      setError("Enter a reason. It is stored on the audit record.");
      return;
    }
    startTransition(async () => {
      const result = await onConfirm(reason.trim());
      if (result.ok) {
        setOpen(false);
        setReason("");
        setAcknowledged(false);
        setError(null);
      } else {
        setError(result.message ?? "The action could not be completed.");
      }
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setReason("");
          setAcknowledged(false);
          setError(null);
        }
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[4px] border border-line bg-surface shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <Dialog.Title className="text-[14px] font-semibold text-ink">{title}</Dialog.Title>
            <Dialog.Description className="mt-1 text-[12.5px] text-ink-muted">
              {description}
            </Dialog.Description>
          </div>
          <div className="space-y-2 px-4 py-3">
            {warning ? (
              <p className="flex items-start gap-1.5 rounded-[3px] border border-[#e6cfa8] bg-warning-soft px-2 py-1.5 text-[12.5px] text-warning">
                <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
                {warning}
              </p>
            ) : null}
            {acknowledgeLabel ? (
              <div className="flex items-start gap-2">
                <input
                  id={acknowledgeId}
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  className="mt-0.5 size-3.5 shrink-0 accent-[#1f4fd8]"
                />
                <label htmlFor={acknowledgeId} className="text-[12.5px] text-ink">
                  {acknowledgeLabel}
                </label>
              </div>
            ) : null}
            {requireReason ? (
              <label className="block">
                <span className="text-[12px] font-medium text-ink">{reasonLabel}</span>
                <textarea
                  value={reason}
                  rows={3}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-1 w-full resize-none rounded-[3px] border border-line-strong bg-surface px-2 py-1.5 text-[13px] text-ink placeholder:text-ink-subtle"
                  placeholder="Recorded in the audit log"
                />
              </label>
            ) : null}
            {error ? (
              <p className="flex items-start gap-1.5 rounded-[3px] border border-[#eebfbd] bg-danger-soft px-2 py-1.5 text-[12.5px] text-danger">
                <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-line bg-canvas px-4 py-2.5">
            <Dialog.Close asChild>
              <Button variant="secondary" size="sm" type="button">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              size="sm"
              type="button"
              disabled={pending}
              onClick={submit}
            >
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
