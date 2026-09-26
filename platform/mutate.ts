import {
  recordAuditEvent,
  type AuditEvent,
  type AuditSource,
} from "./internal/audit-store";
import { AuthorizationError, assertCan, type Permission } from "./rbac";
import { getSession } from "./session";

export type MutationSpec<T> = {
  app: AuditSource;
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
  /** May be async: real datastore writes return promises. */
  apply: () => T | Promise<T>;
};

export type MutationResult<T> =
  | { ok: true; data: T; event: AuditEvent }
  | { ok: false; error: string; event: AuditEvent };

/**
 * The single write path for every internal application.
 *
 * resolve actor -> authorize -> apply -> audit, with denials and failures
 * recorded too. Applications describe the operation they want; they never say
 * who they are acting as, so an application cannot escalate its own privileges
 * by constructing a different user. In production the resolved actor comes from
 * trusted identity-provider session claims instead of the simulated cookie.
 */
export async function mutate<T>(spec: MutationSpec<T>): Promise<MutationResult<T>> {
  const actor = await getSession();
  const entry = {
    actor: actor.name,
    role: actor.role,
    app: spec.app,
    action: spec.action,
    permission: spec.permission,
    entity: spec.entity,
    entityLabel: spec.entityLabel,
    reason: spec.reason,
  };

  try {
    assertCan(actor.role, spec.permission);
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    const event = recordAuditEvent({ ...entry, outcome: "denied" });
    return { ok: false, error: error.message, event };
  }

  try {
    const data = await spec.apply();
    const event = recordAuditEvent({
      ...entry,
      outcome: "success",
      before: spec.before,
      after: spec.after,
    });
    return { ok: true, data, event };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    const event = recordAuditEvent({ ...entry, outcome: "error" });
    return { ok: false, error: message, event };
  }
}
