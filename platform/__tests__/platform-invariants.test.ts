import { beforeEach, describe, expect, it } from "vitest";
import { listAuditEvents, resetAuditLog } from "../audit";
import { mutate } from "../mutate";
import { can, type Permission, type Role } from "../rbac";
import { userForRole } from "../session";

/**
 * Deterministic checks on the platform contract every internal application
 * must respect. New applications should extend this matrix, not bypass it.
 */

type Scenario = {
  name: string;
  permission: Permission;
  app: "kyc" | "refunds" | "flags";
  action: string;
};

const SCENARIOS: Scenario[] = [
  { name: "approve a KYC case", permission: "kyc.approve", app: "kyc", action: "Approve KYC case" },
  { name: "reject a KYC case", permission: "kyc.reject", app: "kyc", action: "Reject KYC case" },
  {
    name: "escalate a KYC case",
    permission: "kyc.escalate",
    app: "kyc",
    action: "Escalate KYC case",
  },
  {
    name: "approve a refund",
    permission: "refund.approve",
    app: "refunds",
    action: "Approve refund",
  },
  { name: "reject a refund", permission: "refund.reject", app: "refunds", action: "Reject refund" },
  { name: "change a feature flag", permission: "flag.update", app: "flags", action: "Update flag" },
];

const EXPECTED: Record<Role, Permission[]> = {
  admin: ["kyc.approve", "kyc.reject", "kyc.escalate", "refund.approve", "refund.reject", "flag.update"],
  reviewer: ["kyc.approve", "kyc.reject", "kyc.escalate", "refund.approve", "refund.reject"],
  readonly: [],
};

function attempt(role: Role, scenario: Scenario) {
  let applied = false;
  const result = mutate(userForRole(role), {
    app: scenario.app,
    action: scenario.action,
    permission: scenario.permission,
    entity: `${scenario.app}:test-1`,
    entityLabel: "test entity",
    reason: "invariant test",
    apply: () => {
      applied = true;
      return "changed";
    },
  });
  return { result, applied };
}

beforeEach(() => {
  resetAuditLog();
});

describe("role permission matrix", () => {
  for (const role of ["admin", "reviewer", "readonly"] as Role[]) {
    for (const scenario of SCENARIOS) {
      const allowed = EXPECTED[role].includes(scenario.permission);
      it(`${role} ${allowed ? "can" : "cannot"} ${scenario.name}`, () => {
        expect(can(role, scenario.permission)).toBe(allowed);
        const { result, applied } = attempt(role, scenario);
        expect(result.ok).toBe(allowed);
        expect(applied).toBe(allowed);
      });
    }
  }
});

describe("read only", () => {
  it("cannot perform any mutation and never changes state", () => {
    for (const scenario of SCENARIOS) {
      const { result, applied } = attempt("readonly", scenario);
      expect(result.ok).toBe(false);
      expect(applied).toBe(false);
    }
  });
});

describe("audit logging", () => {
  it("records a success event for every permitted mutation", () => {
    const { result } = attempt("reviewer", SCENARIOS[0]);
    expect(result.ok).toBe(true);
    const events = listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor: userForRole("reviewer").name,
      role: "reviewer",
      app: "kyc",
      permission: "kyc.approve",
      outcome: "success",
      reason: "invariant test",
    });
  });

  it("records denied attempts without a successful state change", () => {
    const { result, applied } = attempt("reviewer", SCENARIOS[5]);
    expect(result.ok).toBe(false);
    expect(applied).toBe(false);
    const events = listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0].outcome).toBe("denied");
    expect(events.some((event) => event.outcome === "success")).toBe(false);
  });

  it("writes exactly one audit event per mutation attempt", () => {
    attempt("admin", SCENARIOS[5]);
    attempt("readonly", SCENARIOS[3]);
    expect(listAuditEvents()).toHaveLength(2);
  });
});
