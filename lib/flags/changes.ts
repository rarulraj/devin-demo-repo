import { applyFlagChange, getFlag } from "@/lib/data/flag-store";
import {
  FLAG_ENVIRONMENT_LABELS,
  MAX_ROLLOUT,
  MIN_ROLLOUT,
  type FeatureFlag,
} from "@/lib/data/flag-types";
import type { AuditEvent } from "@/platform/audit";
import { mutate } from "@/platform/mutate";
import { getSession } from "@/platform/session";

/**
 * Feature flags mutate differently from KYC and refunds: there is no terminal
 * decision, the same flag changes many times, and the change itself is the
 * payload. The shape below is what an operator asks for; the platform still
 * resolves the actor, authorizes and audits exactly as it does elsewhere.
 */
export type FlagChange =
  | { type: "toggle"; enabled: boolean }
  | { type: "rollout"; rollout: number };

export const MIN_REASON_LENGTH = 3;

export type FlagChangeResult =
  | { ok: true; flag: FeatureFlag; event: AuditEvent }
  | { ok: false; error: string };

function describe(flag: FeatureFlag, change: FlagChange) {
  if (change.type === "toggle") {
    return {
      action: change.enabled ? "Enable feature flag" : "Disable feature flag",
      before: flag.enabled ? "enabled" : "disabled",
      after: change.enabled ? "enabled" : "disabled",
      summary: change.enabled ? "Disabled → Enabled" : "Enabled → Disabled",
      state: { enabled: change.enabled },
    };
  }
  return {
    action: "Change flag rollout",
    before: `${flag.rollout}%`,
    after: `${change.rollout}%`,
    summary: `Rollout ${flag.rollout}% → ${change.rollout}%`,
    state: { rollout: change.rollout },
  };
}

/** Rejects anything that is not a real change, so the ledger stays meaningful. */
function validate(flag: FeatureFlag, change: FlagChange): string | null {
  if (change.type === "toggle") {
    if (flag.enabled === change.enabled) {
      return `${flag.key} is already ${change.enabled ? "enabled" : "disabled"}`;
    }
    return null;
  }
  if (!Number.isInteger(change.rollout)) return "Rollout must be a whole percentage";
  if (change.rollout < MIN_ROLLOUT || change.rollout > MAX_ROLLOUT) {
    return `Rollout must be between ${MIN_ROLLOUT} and ${MAX_ROLLOUT}`;
  }
  if (flag.rollout === change.rollout) return `Rollout is already ${change.rollout}%`;
  return null;
}

/** The only way a feature flag changes state. */
export async function changeFlag(input: {
  key: string;
  change: FlagChange;
  reason: string;
}): Promise<FlagChangeResult> {
  const reason = input.reason.trim();
  if (reason.length < MIN_REASON_LENGTH) {
    return { ok: false, error: "A reason is required and is stored on the audit record." };
  }

  const current = getFlag(input.key);
  if (!current) return { ok: false, error: `Unknown feature flag ${input.key}` };

  const invalid = validate(current, input.change);
  if (invalid) return { ok: false, error: invalid };

  const spec = describe(current, input.change);
  // Read-only: the history entry needs an author. Authorization still resolves
  // its own actor inside mutate().
  const operator = await getSession();

  const result = await mutate({
    app: "flags",
    action: spec.action,
    permission: "flag.update",
    entity: `flag:${current.key}`,
    entityLabel: `${current.key} · ${FLAG_ENVIRONMENT_LABELS[current.environment].toLowerCase()}`,
    reason,
    before: spec.before,
    after: spec.after,
    apply: () =>
      applyFlagChange(current.key, spec.state, {
        author: operator.name,
        at: new Date().toISOString(),
        change: spec.summary,
        text: reason,
      }),
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, flag: result.data, event: result.event };
}
