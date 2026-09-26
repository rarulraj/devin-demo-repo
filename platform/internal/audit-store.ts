import type { Permission, Role } from "../rbac";
import type { AppId } from "../registry";

/**
 * Platform-internal audit ledger.
 *
 * Only the shared mutation path may write here; ESLint blocks application code
 * from importing this module (see eslint.config.mjs). Applications read the
 * ledger through the public API in platform/audit.ts.
 */

/** Audit events also come from the platform itself, which is not a registered app. */
export type AuditSource = AppId | "platform";

export type AuditOutcome = "success" | "denied" | "error";

export type AuditEvent = Readonly<{
  id: string;
  at: string;
  actor: string;
  role: Role;
  app: AuditSource;
  action: string;
  permission: Permission;
  entity: string;
  entityLabel: string;
  outcome: AuditOutcome;
  reason?: string;
  before?: string;
  after?: string;
}>;

export type AuditDraft = Omit<AuditEvent, "id" | "at">;

type AuditStore = { events: AuditEvent[]; sequence: number };

const globalRef = globalThis as typeof globalThis & { __fintechOpsAudit?: AuditStore };

function store(): AuditStore {
  globalRef.__fintechOpsAudit ??= { events: [], sequence: 0 };
  return globalRef.__fintechOpsAudit;
}

function append(draft: AuditDraft, at: string): AuditEvent {
  const s = store();
  s.sequence += 1;
  const event = Object.freeze({
    ...draft,
    id: `evt_${String(s.sequence).padStart(5, "0")}`,
    at,
  });
  s.events.unshift(event);
  return event;
}

export function recordAuditEvent(draft: AuditDraft): AuditEvent {
  return append(draft, new Date().toISOString());
}

export function readAuditEvents(): AuditEvent[] {
  return [...store().events];
}

/** Demo fixtures only; real deployments write history through the mutation path. */
export function seedAuditEvents(drafts: AuditDraft[], startedAt: Date): void {
  if (store().events.length > 0) return;
  drafts.forEach((draft, index) => {
    append(draft, new Date(startedAt.getTime() + index * 7 * 60_000).toISOString());
  });
}

/** Test-only hook so invariant tests start from a clean ledger. */
export function resetAuditLog(): void {
  globalRef.__fintechOpsAudit = { events: [], sequence: 0 };
}
