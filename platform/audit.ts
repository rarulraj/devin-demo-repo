import {
  readAuditEvents,
  resetAuditLog as resetStore,
  seedAuditEvents as seedStore,
  type AuditDraft,
  type AuditEvent,
} from "./internal/audit-store";

export type { AuditEvent, AuditOutcome, AuditSource } from "./internal/audit-store";

/**
 * Public, read-only view of the audit ledger.
 *
 * There is deliberately no exported write function: entries are produced by the
 * shared mutation path (platform/mutate.ts) so no application can record an
 * action it did not actually perform, or perform one without recording it.
 */
export function listAuditEvents(): AuditEvent[] {
  return readAuditEvents();
}

/** Counts for the Overview tiles, computed outside the render path. */
export function auditActivity(windowHours: number): {
  events: AuditEvent[];
  total: number;
  denied: number;
} {
  const since = Date.now() - windowHours * 60 * 60 * 1000;
  const events = readAuditEvents().filter((event) => new Date(event.at).getTime() >= since);
  return {
    events,
    total: events.length,
    denied: events.filter((event) => event.outcome === "denied").length,
  };
}

/** Demo fixtures only, so the prototype is never empty on first load. */
export function seedAuditEvents(drafts: AuditDraft[], startedAt: Date): void {
  seedStore(drafts, startedAt);
}

/** Test-only hook so invariant tests start from a clean ledger. */
export function resetAuditLog(): void {
  resetStore();
}
