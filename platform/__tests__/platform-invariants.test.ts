import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAuditEvents, resetAuditLog } from "../audit";
import { mutate } from "../mutate";
import { can, type Permission, type Role } from "../rbac";
import { ROLE_COOKIE, userForRole } from "../session";
import { appLabel } from "../registry";

/**
 * Deterministic checks on the platform contract every internal application
 * must respect. New applications should extend this matrix, not bypass it.
 */

/** Stands in for the browser cookie the demo role switcher sets. */
let currentRole: Role = "reviewer";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === ROLE_COOKIE ? { name, value: currentRole } : undefined),
  }),
}));

function signInAs(role: Role) {
  currentRole = role;
}

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
  admin: [
    "kyc.approve",
    "kyc.reject",
    "kyc.escalate",
    "refund.approve",
    "refund.reject",
    "flag.update",
  ],
  reviewer: ["kyc.approve", "kyc.reject", "kyc.escalate", "refund.approve", "refund.reject"],
  readonly: [],
};

/** State an application would own; mutations must only reach it through mutate(). */
let state = "pending";

async function attempt(role: Role, scenario: Scenario) {
  signInAs(role);
  let applied = false;
  const result = await mutate({
    app: scenario.app,
    action: scenario.action,
    permission: scenario.permission,
    entity: `${scenario.app}:test-1`,
    entityLabel: "test entity",
    reason: "invariant test",
    before: "pending",
    after: "approved",
    apply: async () => {
      applied = true;
      state = "approved";
      return "changed";
    },
  });
  return { result, applied };
}

beforeEach(() => {
  resetAuditLog();
  state = "pending";
  signInAs("reviewer");
});

describe("role permission matrix", () => {
  for (const role of ["admin", "reviewer", "readonly"] as Role[]) {
    for (const scenario of SCENARIOS) {
      const allowed = EXPECTED[role].includes(scenario.permission);
      it(`${role} ${allowed ? "can" : "cannot"} ${scenario.name}`, async () => {
        expect(can(role, scenario.permission)).toBe(allowed);
        const { result, applied } = await attempt(role, scenario);
        expect(result.ok).toBe(allowed);
        expect(applied).toBe(allowed);
      });
    }
  }
});

describe("read only", () => {
  it("cannot perform any mutation and never changes state", async () => {
    for (const scenario of SCENARIOS) {
      const { result, applied } = await attempt("readonly", scenario);
      expect(result.ok).toBe(false);
      expect(applied).toBe(false);
      expect(state).toBe("pending");
    }
  });
});

describe("trust boundary", () => {
  it("authorizes against the session actor, not anything the caller supplies", async () => {
    signInAs("readonly");
    const result = await mutate({
      app: "flags",
      action: "Update flag",
      permission: "flag.update",
      entity: "flag:test",
      entityLabel: "test flag",
      // An application trying to escalate by naming a different user: these are
      // not part of MutationSpec and must not influence the decision.
      ...({ actor: userForRole("admin"), role: "admin" } as object),
      apply: () => "changed",
    });

    expect(result.ok).toBe(false);
    const [event] = listAuditEvents();
    expect(event.outcome).toBe("denied");
    expect(event.role).toBe("readonly");
    expect(event.actor).toBe(userForRole("readonly").name);
  });

  it("records the mutation under the role the session resolves to", async () => {
    await attempt("admin", SCENARIOS[5]);
    expect(listAuditEvents()[0]).toMatchObject({
      role: "admin",
      actor: userForRole("admin").name,
      outcome: "success",
    });
  });
});

describe("audit logging", () => {
  it("records exactly one success event for a permitted mutation", async () => {
    const { result } = await attempt("reviewer", SCENARIOS[0]);
    expect(result.ok).toBe(true);
    const events = listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor: userForRole("reviewer").name,
      role: "reviewer",
      app: "kyc",
      action: "Approve KYC case",
      permission: "kyc.approve",
      entity: "kyc:test-1",
      outcome: "success",
      reason: "invariant test",
      before: "pending",
      after: "approved",
    });
  });

  it("records denied attempts without a successful state change", async () => {
    const { result, applied } = await attempt("reviewer", SCENARIOS[5]);
    expect(result.ok).toBe(false);
    expect(applied).toBe(false);
    expect(state).toBe("pending");
    const events = listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0].outcome).toBe("denied");
    expect(events[0].after).toBeUndefined();
    expect(events.some((event) => event.outcome === "success")).toBe(false);
  });

  it("writes exactly one audit event per mutation attempt", async () => {
    await attempt("admin", SCENARIOS[5]);
    await attempt("readonly", SCENARIOS[3]);
    expect(listAuditEvents()).toHaveLength(2);
  });

  it("does not expose a write API that applications could use directly", async () => {
    const api = await import("../audit");
    expect(Object.keys(api).some((key) => /record|append|write/i.test(key))).toBe(false);
  });

  it("returns events that cannot be used to rewrite history", async () => {
    await attempt("admin", SCENARIOS[0]);
    const [event] = listAuditEvents();
    expect(() => {
      (event as { outcome: string }).outcome = "denied";
    }).toThrow();
    expect(listAuditEvents()[0].outcome).toBe("success");
  });
});

describe("async operations", () => {
  it("awaits the operation before recording success", async () => {
    signInAs("admin");
    const order: string[] = [];
    const result = await mutate({
      app: "flags",
      action: "Update flag",
      permission: "flag.update",
      entity: "flag:instant_payouts",
      entityLabel: "instant_payouts",
      apply: async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push("applied");
        return "done";
      },
    });
    order.push("audited");

    expect(result.ok).toBe(true);
    expect(order).toEqual(["applied", "audited"]);
    expect(listAuditEvents()[0].outcome).toBe("success");
  });

  it("records a failure rather than a success when the operation rejects", async () => {
    signInAs("admin");
    const result = await mutate({
      app: "flags",
      action: "Update flag",
      permission: "flag.update",
      entity: "flag:instant_payouts",
      entityLabel: "instant_payouts",
      apply: async () => {
        throw new Error("datastore unavailable");
      },
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe("datastore unavailable");
    const events = listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0].outcome).toBe("error");
  });
});

describe("audit sources outside the application registry", () => {
  it("labels platform events instead of failing to resolve them", async () => {
    signInAs("admin");
    await mutate({
      app: "platform",
      action: "Rotate signing key",
      permission: "flag.update",
      entity: "platform:signing-key",
      entityLabel: "signing key",
      apply: () => "rotated",
    });

    const [event] = listAuditEvents();
    expect(event.app).toBe("platform");
    expect(appLabel(event.app)).toBe("Platform");
    expect(appLabel("kyc")).toBe("KYC Reviews");
  });
});
