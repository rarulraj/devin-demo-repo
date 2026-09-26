import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAccount,
  getRequest,
  listRequests,
  pendingRequestFor,
  resetLimits,
} from "@/lib/data/limit-store";
import { decideLimitRequest, requestLimitChange } from "@/lib/limits/requests";
import { listAuditEvents, resetAuditLog } from "@/platform/audit";
import type { Role } from "@/platform/rbac";
import { ROLE_COOKIE } from "@/platform/session";

/**
 * Transaction Limits on top of the shared platform. The interesting property
 * is the split authorization: a reviewer may raise a request but only an
 * approver may grant it, and the platform — not this application — enforces it.
 */

let currentRole: Role = "admin";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === ROLE_COOKIE ? { name, value: currentRole } : undefined),
  }),
}));

function signInAs(role: Role) {
  currentRole = role;
}

/** Deterministic fixtures. */
const ACCOUNT = "ACC-20841"; // £25,000 limit, open request LR-3184 for £40,000
const OPEN_REQUEST = "LR-3184";
const QUIET_ACCOUNT = "ACC-20934"; // £5,000 limit, no open request
const DECIDED_REQUEST = "LR-3172";

beforeEach(() => {
  resetLimits(new Date("2026-01-15T09:00:00.000Z"));
  resetAuditLog();
  signInAs("admin");
});

describe("requesting a limit change", () => {
  it("reviewer can raise a request without changing the limit", async () => {
    signInAs("reviewer");
    const before = getAccount(QUIET_ACCOUNT)!.dailyLimitMinor;

    const result = await requestLimitChange({
      accountId: QUIET_ACCOUNT,
      requestedLimitMinor: 1_200_000,
      justification: "Contract volume evidenced by twelve months of statements",
    });

    expect(result.ok).toBe(true);
    expect(getAccount(QUIET_ACCOUNT)?.dailyLimitMinor).toBe(before);
    expect(pendingRequestFor(QUIET_ACCOUNT)).toMatchObject({
      requestedLimitMinor: 1_200_000,
      previousLimitMinor: before,
      requestedBy: "Marcus Adeyemi",
      status: "pending",
    });
  });

  it("audits the request with the requested limit, not an applied one", async () => {
    signInAs("reviewer");
    await requestLimitChange({
      accountId: QUIET_ACCOUNT,
      requestedLimitMinor: 1_200_000,
      justification: "Contract volume evidenced by twelve months of statements",
    });

    const events = listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor: "Marcus Adeyemi",
      role: "reviewer",
      app: "limits",
      action: "Request limit change",
      permission: "limit.request",
      entity: `account:${QUIET_ACCOUNT}`,
      outcome: "success",
      reason: "Contract volume evidenced by twelve months of statements",
      before: "£5,000",
      after: "£12,000 requested",
    });
  });

  it("read only cannot request a change, and the attempt is audited as denied", async () => {
    signInAs("readonly");
    const result = await requestLimitChange({
      accountId: QUIET_ACCOUNT,
      requestedLimitMinor: 1_200_000,
      justification: "Attempting from a view-only session",
    });

    expect(result.ok).toBe(false);
    expect(pendingRequestFor(QUIET_ACCOUNT)).toBeUndefined();
    expect(listAuditEvents()[0]).toMatchObject({ role: "readonly", outcome: "denied" });
  });

  it("refuses a second open request for the same account", async () => {
    const result = await requestLimitChange({
      accountId: ACCOUNT,
      requestedLimitMinor: 5_000_000,
      justification: "Duplicate of the request already awaiting a decision",
    });

    expect(result).toMatchObject({ ok: false });
    expect(listRequests(ACCOUNT).filter((entry) => entry.status === "pending")).toHaveLength(1);
    expect(listAuditEvents()[0]).toMatchObject({ outcome: "error" });
  });

  it("rejects an out-of-range limit before reaching the platform", async () => {
    const result = await requestLimitChange({
      accountId: QUIET_ACCOUNT,
      requestedLimitMinor: 5_000,
      justification: "Typo in the amount",
    });

    expect(result).toMatchObject({ ok: false });
    expect(listAuditEvents()).toHaveLength(0);
  });

  it("requires a justification", async () => {
    const result = await requestLimitChange({
      accountId: QUIET_ACCOUNT,
      requestedLimitMinor: 1_200_000,
      justification: " ",
    });

    expect(result).toMatchObject({ ok: false });
    expect(listAuditEvents()).toHaveLength(0);
  });
});

describe("deciding a request", () => {
  it("admin approval moves the account limit to the requested value", async () => {
    const result = await decideLimitRequest({
      requestId: OPEN_REQUEST,
      decision: "approve",
      reason: "Wholesale contract evidenced",
    });

    expect(result.ok).toBe(true);
    expect(getRequest(OPEN_REQUEST)?.status).toBe("approved");
    expect(getAccount(ACCOUNT)?.dailyLimitMinor).toBe(4_000_000);
    expect(getAccount(ACCOUNT)?.limitSetBy).toBe("Dana Whitfield");
  });

  it("admin rejection closes the request and leaves the limit alone", async () => {
    const result = await decideLimitRequest({
      requestId: OPEN_REQUEST,
      decision: "reject",
      reason: "Source of funds not evidenced",
    });

    expect(result.ok).toBe(true);
    expect(getRequest(OPEN_REQUEST)?.status).toBe("rejected");
    expect(getAccount(ACCOUNT)?.dailyLimitMinor).toBe(2_500_000);
  });

  it("audits the approval with the limit before and after", async () => {
    await decideLimitRequest({
      requestId: OPEN_REQUEST,
      decision: "approve",
      reason: "Wholesale contract evidenced",
    });

    const events = listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor: "Dana Whitfield",
      role: "admin",
      app: "limits",
      action: "Approve limit change",
      permission: "limit.approve",
      entity: `limit_request:${OPEN_REQUEST}`,
      entityLabel: `${OPEN_REQUEST} · Northgate Coffee Roasters · £40,000`,
      outcome: "success",
      before: "£25,000",
      after: "£40,000",
    });
  });

  it.each(["approve", "reject"] as const)(
    "reviewer cannot %s a request, and the limit is unchanged",
    async (decision) => {
      signInAs("reviewer");
      const result = await decideLimitRequest({
        requestId: OPEN_REQUEST,
        decision,
        reason: "Reviewer attempting a decision",
      });

      expect(result.ok).toBe(false);
      expect(getRequest(OPEN_REQUEST)?.status).toBe("pending");
      expect(getAccount(ACCOUNT)?.dailyLimitMinor).toBe(2_500_000);
      expect(listAuditEvents()[0]).toMatchObject({
        role: "reviewer",
        outcome: "denied",
        reason: "Reviewer attempting a decision",
      });
    },
  );

  it("read only cannot approve", async () => {
    signInAs("readonly");
    const result = await decideLimitRequest({
      requestId: OPEN_REQUEST,
      decision: "approve",
      reason: "Attempting from a view-only session",
    });

    expect(result.ok).toBe(false);
    expect(listAuditEvents()[0]).toMatchObject({ role: "readonly", outcome: "denied" });
  });

  it("requires a decision reason", async () => {
    const result = await decideLimitRequest({
      requestId: OPEN_REQUEST,
      decision: "approve",
      reason: " ",
    });

    expect(result).toMatchObject({ ok: false });
    expect(getRequest(OPEN_REQUEST)?.status).toBe("pending");
    expect(listAuditEvents()).toHaveLength(0);
  });

  it("refuses to decide an already decided request", async () => {
    const result = await decideLimitRequest({
      requestId: DECIDED_REQUEST,
      decision: "reject",
      reason: "Second look",
    });

    expect(result).toMatchObject({ ok: false });
    expect(getRequest(DECIDED_REQUEST)?.status).toBe("approved");
    expect(listAuditEvents()).toHaveLength(0);
  });

  it("reports an unknown request without writing an audit event", async () => {
    const result = await decideLimitRequest({
      requestId: "LR-0000",
      decision: "approve",
      reason: "Does not exist",
    });

    expect(result).toMatchObject({ ok: false });
    expect(listAuditEvents()).toHaveLength(0);
  });
});
