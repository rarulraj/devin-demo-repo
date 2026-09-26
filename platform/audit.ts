import type { Permission, Role } from "./rbac";
import type { AppId } from "./registry";

export type AuditOutcome = "success" | "denied";

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  role: Role;
  app: AppId;
  action: string;
  permission: Permission;
  entity: string;
  entityLabel: string;
  outcome: AuditOutcome;
  reason?: string;
  before?: string;
  after?: string;
};

type AuditStore = { events: AuditEvent[]; sequence: number };

const globalRef = globalThis as typeof globalThis & { __fintechOpsAudit?: AuditStore };

function store(): AuditStore {
  globalRef.__fintechOpsAudit ??= { events: [], sequence: 0 };
  return globalRef.__fintechOpsAudit;
}

export function recordAudit(event: Omit<AuditEvent, "id" | "at">): AuditEvent {
  const s = store();
  s.sequence += 1;
  const recorded: AuditEvent = {
    ...event,
    id: `evt_${String(s.sequence).padStart(5, "0")}`,
    at: new Date().toISOString(),
  };
  s.events.unshift(recorded);
  return recorded;
}

export function listAuditEvents(): AuditEvent[] {
  return [...store().events];
}

/** Counts for the Overview tiles, computed outside the render path. */
export function auditActivity(windowHours: number): {
  events: AuditEvent[];
  total: number;
  denied: number;
} {
  const since = Date.now() - windowHours * 60 * 60 * 1000;
  const events = store().events.filter((event) => new Date(event.at).getTime() >= since);
  return {
    events,
    total: events.length,
    denied: events.filter((event) => event.outcome === "denied").length,
  };
}

export function seedAuditEvents(events: Omit<AuditEvent, "id" | "at">[], startedAt: Date): void {
  const s = store();
  if (s.events.length > 0) return;
  events.forEach((event, index) => {
    s.sequence += 1;
    s.events.unshift({
      ...event,
      id: `evt_${String(s.sequence).padStart(5, "0")}`,
      at: new Date(startedAt.getTime() + index * 7 * 60_000).toISOString(),
    });
  });
}

/** Test-only hook so invariant tests start from a clean ledger. */
export function resetAuditLog(): void {
  globalRef.__fintechOpsAudit = { events: [], sequence: 0 };
}
