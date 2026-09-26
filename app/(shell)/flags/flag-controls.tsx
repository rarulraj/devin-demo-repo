"use client";

import { ShieldAlert } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MAX_ROLLOUT, MIN_ROLLOUT } from "@/lib/data/flag-types";
import type { FlagChange } from "@/lib/flags/changes";
import { Button } from "@/platform/ui/button";
import { ConfirmDialog } from "@/platform/ui/confirm-dialog";
import { submitFlagChange } from "./actions";

/**
 * Two controls rather than a decision bar: a flag is toggled and its rollout is
 * moved, repeatedly, over the life of the flag. Production changes add an
 * explicit acknowledgement on top of the reason every change already requires.
 */
export function FlagControls({
  flagKey,
  label,
  enabled,
  rollout,
  production,
  roleLabel,
  canUpdate,
}: {
  flagKey: string;
  label: string;
  enabled: boolean;
  rollout: number;
  production: boolean;
  roleLabel: string;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [target, setTarget] = useState(String(rollout));

  async function run(change: FlagChange, reason: string) {
    const result = await submitFlagChange(flagKey, change, reason);
    if (!result.ok) return { ok: false, message: result.message };
    const params = new URLSearchParams(searchParams.toString());
    params.set("flag", flagKey);
    params.set("done", change.type);
    router.replace(`${pathname}?${params}`, { scroll: false });
    return { ok: true };
  }

  const productionWarning = production
    ? `${label} is live in production. This change takes effect immediately.`
    : undefined;
  const acknowledgeLabel = production
    ? "I understand this changes production behaviour now"
    : undefined;
  const parsedTarget = Number(target);
  const targetValid =
    Number.isInteger(parsedTarget) && parsedTarget >= MIN_ROLLOUT && parsedTarget <= MAX_ROLLOUT;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-end gap-2">
        <ConfirmDialog
          title={
            canUpdate
              ? `${enabled ? "Disable" : "Enable"} ${label}`
              : `${enabled ? "Disable" : "Enable"} is not available`
          }
          description={
            canUpdate
              ? `${flagKey} becomes ${enabled ? "unavailable to all traffic" : `available to ${rollout}% of traffic`}.`
              : `Turning ${flagKey} ${enabled ? "off" : "on"} would change runtime behaviour. ${roleLabel} is not authorized, so the platform refuses this operation and the flag does not change.`
          }
          confirmLabel={
            canUpdate
              ? enabled
                ? "Disable flag"
                : "Enable flag"
              : `Attempt ${enabled ? "disable" : "enable"}`
          }
          tone={enabled ? "danger" : "primary"}
          reasonLabel="Change reason"
          warning={canUpdate ? productionWarning : undefined}
          acknowledgeLabel={canUpdate ? acknowledgeLabel : undefined}
          onConfirm={(reason) => run({ type: "toggle", enabled: !enabled }, reason)}
          trigger={
            <Button variant={enabled ? "danger" : "primary"} size="md">
              {enabled ? "Disable" : "Enable"}
            </Button>
          }
        />

        <label className="text-[12px] font-medium text-ink">
          <span className="block">Rollout %</span>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_ROLLOUT}
            max={MAX_ROLLOUT}
            step={5}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="mt-1 w-[88px] rounded-[3px] border border-line-strong bg-surface px-2 py-1.5 text-[13px] text-ink"
          />
        </label>

        <ConfirmDialog
          title={canUpdate ? `Change rollout for ${label}` : "Rollout change is not available"}
          description={
            canUpdate
              ? `${flagKey} moves from ${rollout}% to ${targetValid ? parsedTarget : rollout}% of eligible traffic.`
              : `A rollout change on ${flagKey} would alter how much traffic sees this flag. ${roleLabel} is not authorized, so the platform refuses this operation and the flag does not change.`
          }
          confirmLabel={canUpdate ? "Change rollout" : "Attempt change"}
          reasonLabel="Change reason"
          warning={canUpdate ? productionWarning : undefined}
          acknowledgeLabel={canUpdate ? acknowledgeLabel : undefined}
          onConfirm={(reason) =>
            targetValid
              ? run({ type: "rollout", rollout: parsedTarget }, reason)
              : Promise.resolve({
                  ok: false,
                  message: `Enter a whole percentage between ${MIN_ROLLOUT} and ${MAX_ROLLOUT}.`,
                })
          }
          trigger={
            <Button variant="secondary" size="md">
              Update rollout
            </Button>
          }
        />
      </div>

      {enabled ? null : (
        <p className="text-[12px] text-ink-muted">
          Rollout is stored while the flag is off and applies again when it is enabled.
        </p>
      )}

      {canUpdate ? null : (
        <p className="flex items-start gap-1.5 rounded-[3px] border border-line-strong bg-canvas px-2 py-1.5 text-[12.5px] text-ink-muted">
          <ShieldAlert aria-hidden className="mt-px size-3.5 shrink-0 text-ink-subtle" />
          <span>
            {roleLabel} cannot change feature flags. These controls stay clickable on purpose: the
            platform refuses the operation server-side and records the attempt in the audit log.
          </span>
        </p>
      )}
    </div>
  );
}
