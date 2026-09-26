import { beforeEach, describe, expect, it, vi } from "vitest";
import { getKycCase, resetKycCases } from "@/lib/data/kyc-store";
import { decideKycCase, type KycDecision } from "@/lib/kyc/decisions";
import { listAuditEvents, resetAuditLog } from "@/platform/audit";
import { ROLE_COOKIE } from "@/platform/session";
import type { Role } from "@/platform/rbac";

/**
 * KYC behaviour on top of the shared platform. These tests exist to prove the
 * application stayed inside the paved road: every state change is authorized
 * and audited by the platform, not by KYC code.
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

/** Deterministic fixtures: KYC-4836 is the riskiest open case. */
const OPEN_CASE = "KYC-4836";
const CLOSED_CASE = "KYC-4821";

beforeEach(() => {
  resetKycCases(new Date("2026-01-15T09:00:00.000Z"));
  resetAuditLog();
  signInAs("reviewer");
});

const DECISIONS: { decision: KycDecision; status: string; action: string }[] = [
  { decision: "approve", status: "approved", action: "Approve KYC case" },
  { decision: "reject", status: "rejected", action: "Reject KYC case" },
  { decision: "escalate", status: "escalated", action: "Escalate KYC case" },
];

describe("reviewer decisions", () => {
  it.each(DECISIONS)("reviewer can $decision a pending case", async ({ decision, status }) => {
    const result = await decideKycCase({
      caseId: OPEN_CASE,
      decision,
      reason: "Checked supporting documents",
    });

    expect(result.ok).toBe(true);
    expect(getKycCase(OPEN_CASE)?.status).toBe(status);
  });

  it.each(DECISIONS)("$decision writes one audit event with before/after", async ({
    decision,
    action,
    status,
  }) => {
    await decideKycCase({ caseId: OPEN_CASE, decision, reason: "Sanctions hit confirmed" });

    const events = listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor: "Marcus Adeyemi",
      role: "reviewer",
      app: "kyc",
      action,
      entity: `kyc_case:${OPEN_CASE}`,
      outcome: "success",
      reason: "Sanctions hit confirmed",
      before: "pending",
      after: status,
    });
    expect(events[0].entityLabel).toContain("Meridian Crypto Exchange");
  });

  it("records the decision as a reviewer note on the case", async () => {
    await decideKycCase({
      caseId: OPEN_CASE,
      decision: "escalate",
      reason: "Beneficial owner needs enhanced due diligence",
    });

    expect(getKycCase(OPEN_CASE)?.notes[0]).toMatchObject({
      author: "Marcus Adeyemi",
      text: "Beneficial owner needs enhanced due diligence",
    });
  });

  it("admin can decide as well", async () => {
    signInAs("admin");
    const result = await decideKycCase({
      caseId: OPEN_CASE,
      decision: "reject",
      reason: "Confirmed sanctions match",
    });

    expect(result.ok).toBe(true);
    expect(listAuditEvents()[0]).toMatchObject({ actor: "Dana Whitfield", role: "admin" });
  });
});

describe("read only", () => {
  it.each(DECISIONS)("cannot $decision, and the case is unchanged", async ({ decision }) => {
    signInAs("readonly");
    const before = getKycCase(OPEN_CASE)!;

    const result = await decideKycCase({ caseId: OPEN_CASE, decision, reason: "Trying anyway" });

    expect(result.ok).toBe(false);
    const after = getKycCase(OPEN_CASE)!;
    expect(after.status).toBe(before.status);
    expect(after.notes).toHaveLength(before.notes.length);
  });

  it("produces a denied audit event, never a successful one", async () => {
    signInAs("readonly");
    await decideKycCase({ caseId: OPEN_CASE, decision: "approve", reason: "Trying anyway" });

    const events = listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor: "Priya Raman",
      role: "readonly",
      outcome: "denied",
      reason: "Trying anyway",
    });
    expect(events.some((event) => event.outcome === "success")).toBe(false);
    expect(events[0].after).toBeUndefined();
  });
});

describe("decision guards", () => {
  it("requires a reason and does not touch state or the ledger", async () => {
    const result = await decideKycCase({ caseId: OPEN_CASE, decision: "approve", reason: "  " });

    expect(result).toMatchObject({ ok: false });
    expect(getKycCase(OPEN_CASE)?.status).toBe("pending");
    expect(listAuditEvents()).toHaveLength(0);
  });

  it("refuses to re-decide a closed case and records the failure, not a success", async () => {
    const result = await decideKycCase({
      caseId: CLOSED_CASE,
      decision: "reject",
      reason: "Second thoughts",
    });

    expect(result.ok).toBe(false);
    expect(getKycCase(CLOSED_CASE)?.status).toBe("approved");
    expect(listAuditEvents()[0]).toMatchObject({ outcome: "error" });
  });

  it("rejects an unknown case without writing anything", async () => {
    const result = await decideKycCase({
      caseId: "KYC-0000",
      decision: "approve",
      reason: "Does not exist",
    });

    expect(result.ok).toBe(false);
    expect(listAuditEvents()).toHaveLength(0);
  });
});
