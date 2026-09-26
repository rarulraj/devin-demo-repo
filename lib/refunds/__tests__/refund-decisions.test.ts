import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRefund, resetRefunds } from "@/lib/data/refund-store";
import { decideRefund, type RefundDecision } from "@/lib/refunds/decisions";
import { listAuditEvents, resetAuditLog } from "@/platform/audit";
import type { Role } from "@/platform/rbac";
import { ROLE_COOKIE } from "@/platform/session";

/**
 * Refund behaviour on top of the shared platform. As with KYC, these tests
 * exist to prove the application stayed inside the paved road: authorization
 * and audit belong to the platform, not to refund code.
 */

let currentRole: Role = "reviewer";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === ROLE_COOKIE ? { name, value: currentRole } : undefined),
  }),
}));

function signInAs(role: Role) {
  currentRole = role;
}

/** Deterministic fixtures: RF-10296 is the largest pending request. */
const PENDING_REFUND = "RF-10296";
const DECIDED_REFUND = "RF-10284";

beforeEach(() => {
  resetRefunds(new Date("2026-01-15T09:00:00.000Z"));
  resetAuditLog();
  signInAs("reviewer");
});

const DECISIONS: { decision: RefundDecision; status: string; action: string }[] = [
  { decision: "approve", status: "approved", action: "Approve refund" },
  { decision: "reject", status: "rejected", action: "Reject refund" },
];

describe("reviewer decisions", () => {
  it.each(DECISIONS)("reviewer can $decision a pending refund", async ({ decision, status }) => {
    const result = await decideRefund({
      refundId: PENDING_REFUND,
      decision,
      reason: "Courier confirmed the consignment as lost",
    });

    expect(result.ok).toBe(true);
    expect(getRefund(PENDING_REFUND)?.status).toBe(status);
  });

  it.each(DECISIONS)(
    "$decision writes one audit event carrying who, what, why and the amount",
    async ({ decision, action, status }) => {
      await decideRefund({
        refundId: PENDING_REFUND,
        decision,
        reason: "Courier confirmed the consignment as lost",
      });

      const events = listAuditEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        actor: "Marcus Adeyemi",
        role: "reviewer",
        app: "refunds",
        action,
        entity: `refund:${PENDING_REFUND}`,
        entityLabel: `${PENDING_REFUND} · £4,899.00`,
        outcome: "success",
        reason: "Courier confirmed the consignment as lost",
        before: "pending",
        after: status,
      });
    },
  );

  it("records the decision reason against the refund", async () => {
    await decideRefund({
      refundId: PENDING_REFUND,
      decision: "approve",
      reason: "Merchant cannot re-ship",
    });

    expect(getRefund(PENDING_REFUND)?.notes[0]).toMatchObject({
      author: "Marcus Adeyemi",
      text: "Merchant cannot re-ship",
    });
  });

  it("admin can decide refunds", async () => {
    signInAs("admin");
    const result = await decideRefund({
      refundId: PENDING_REFUND,
      decision: "approve",
      reason: "Escalated by payments",
    });

    expect(result.ok).toBe(true);
    expect(listAuditEvents()[0]).toMatchObject({ role: "admin", outcome: "success" });
  });
});

describe("read only", () => {
  it.each(DECISIONS)("read only cannot $decision", async ({ decision }) => {
    signInAs("readonly");
    const result = await decideRefund({
      refundId: PENDING_REFUND,
      decision,
      reason: "Attempting from a view-only session",
    });

    expect(result.ok).toBe(false);
    expect(getRefund(PENDING_REFUND)?.status).toBe("pending");
  });

  it("records the refused attempt as denied, not success", async () => {
    signInAs("readonly");
    await decideRefund({
      refundId: PENDING_REFUND,
      decision: "approve",
      reason: "Attempting from a view-only session",
    });

    const events = listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      role: "readonly",
      outcome: "denied",
      reason: "Attempting from a view-only session",
    });
    expect(events[0].after).toBeUndefined();
  });
});

describe("input and state guards", () => {
  it("requires a reason", async () => {
    const result = await decideRefund({ refundId: PENDING_REFUND, decision: "approve", reason: " " });

    expect(result).toMatchObject({ ok: false });
    expect(getRefund(PENDING_REFUND)?.status).toBe("pending");
    expect(listAuditEvents()).toHaveLength(0);
  });

  it("refuses to change an already decided refund", async () => {
    const result = await decideRefund({
      refundId: DECIDED_REFUND,
      decision: "reject",
      reason: "Second look after reconciliation",
    });

    expect(result).toMatchObject({ ok: false });
    expect(getRefund(DECIDED_REFUND)?.status).toBe("approved");
    expect(listAuditEvents()[0]).toMatchObject({ outcome: "error" });
  });

  it("reports an unknown refund without writing an audit event", async () => {
    const result = await decideRefund({
      refundId: "RF-00000",
      decision: "approve",
      reason: "Does not exist",
    });

    expect(result).toMatchObject({ ok: false });
    expect(listAuditEvents()).toHaveLength(0);
  });
});
