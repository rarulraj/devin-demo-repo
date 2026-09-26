import { recordAudit, type AuditEvent } from "./audit";
import { AuthorizationError, assertCan, type Permission } from "./rbac";
import type { AppId } from "./registry";
import type { SimulatedUser } from "./session";

export type MutationSpec<T> = {
  app: AppId;
  /** Human-readable action name, e.g. "Approve refund". */
  action: string;
  permission: Permission;
  /** Stable entity key, e.g. "refund:rf_1043". */
  entity: string;
  /** Entity label as an operator would recognise it. */
  entityLabel: string;
  reason?: string;
  before?: string;
  after?: string;
  apply: () => T;
};

export type MutationResult<T> =
  | { ok: true; data: T; event: AuditEvent }
  | { ok: false; error: string; event: AuditEvent };

/**
 * The single write path for every internal application.
 *
 * authorize -> apply -> audit, in that order, with denials recorded too.
 * Applications must not mutate state outside this function; that is what makes
 * RBAC and the audit trail platform guarantees rather than per-app conventions.
 */
export function mutate<T>(actor: SimulatedUser, spec: MutationSpec<T>): MutationResult<T> {
  try {
    assertCan(actor.role, spec.permission);
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    const event = recordAudit({
      actor: actor.name,
      role: actor.role,
      app: spec.app,
      action: spec.action,
      permission: spec.permission,
      entity: spec.entity,
      entityLabel: spec.entityLabel,
      outcome: "denied",
      reason: spec.reason,
    });
    return { ok: false, error: error.message, event };
  }

  const data = spec.apply();
  const event = recordAudit({
    actor: actor.name,
    role: actor.role,
    app: spec.app,
    action: spec.action,
    permission: spec.permission,
    entity: spec.entity,
    entityLabel: spec.entityLabel,
    outcome: "success",
    reason: spec.reason,
    before: spec.before,
    after: spec.after,
  });
  return { ok: true, data, event };
}
