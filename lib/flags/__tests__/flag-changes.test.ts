import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFlag, listFlags, resetFlags } from "@/lib/data/flag-store";
import { isPartialRollout, midRollout } from "@/lib/data/flag-types";
import { changeFlag } from "@/lib/flags/changes";
import { listAuditEvents, resetAuditLog } from "@/platform/audit";
import type { Role } from "@/platform/rbac";
import { ROLE_COOKIE } from "@/platform/session";

/**
 * Feature flag behaviour on top of the shared platform. Flags are the first
 * repeatable mutation in the prototype, so these tests also pin that changing
 * the same entity twice stays authorized and audited every time.
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

/** Deterministic fixtures: on in production at 75%, off in production at 25%. */
const ENABLED_FLAG = "card_3ds_step_up";
const DISABLED_FLAG = "instant_payouts";

beforeEach(() => {
  resetFlags(new Date("2026-01-15T09:00:00.000Z"));
  resetAuditLog();
  signInAs("admin");
});

describe("admin changes", () => {
  it("disables an enabled flag", async () => {
    const result = await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "toggle", enabled: false },
      reason: "INC-2304 elevated 3DS failures",
    });

    expect(result.ok).toBe(true);
    expect(getFlag(ENABLED_FLAG)?.enabled).toBe(false);
  });

  it("enables a disabled flag", async () => {
    const result = await changeFlag({
      key: DISABLED_FLAG,
      change: { type: "toggle", enabled: true },
      reason: "Payout latency back within SLO",
    });

    expect(result.ok).toBe(true);
    expect(getFlag(DISABLED_FLAG)?.enabled).toBe(true);
  });

  it("changes the rollout percentage", async () => {
    const result = await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "rollout", rollout: 90 },
      reason: "Fraud rate stable at 75%",
    });

    expect(result.ok).toBe(true);
    expect(getFlag(ENABLED_FLAG)?.rollout).toBe(90);
  });

  it("audits a toggle with who, what, why and the before/after state", async () => {
    await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "toggle", enabled: false },
      reason: "INC-2304 elevated 3DS failures",
    });

    const events = listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor: "Dana Whitfield",
      role: "admin",
      app: "flags",
      action: "Disable feature flag",
      permission: "flag.update",
      entity: `flag:${ENABLED_FLAG}`,
      entityLabel: `${ENABLED_FLAG} · production`,
      outcome: "success",
      reason: "INC-2304 elevated 3DS failures",
      before: "enabled",
      after: "disabled",
    });
  });

  it("audits a rollout change as percentages, not booleans", async () => {
    await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "rollout", rollout: 90 },
      reason: "Fraud rate stable at 75%",
    });

    expect(listAuditEvents()[0]).toMatchObject({
      action: "Change flag rollout",
      before: "75%",
      after: "90%",
      outcome: "success",
    });
  });

  it("records the reason on the flag's change history", async () => {
    await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "rollout", rollout: 90 },
      reason: "Fraud rate stable at 75%",
    });

    expect(getFlag(ENABLED_FLAG)?.history[0]).toMatchObject({
      author: "Dana Whitfield",
      change: "Rollout 75% → 90%",
      text: "Fraud rate stable at 75%",
    });
  });

  it("audits every change to the same flag, not just the first", async () => {
    await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "rollout", rollout: 90 },
      reason: "First expansion",
    });
    await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "toggle", enabled: false },
      reason: "Rolled back after error spike",
    });

    expect(listAuditEvents()).toHaveLength(2);
    expect(getFlag(ENABLED_FLAG)).toMatchObject({ enabled: false, rollout: 90 });
  });
});

describe("roles without flag.update", () => {
  it.each(["reviewer", "readonly"] as const)("%s cannot toggle a flag", async (role) => {
    signInAs(role);
    const result = await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "toggle", enabled: false },
      reason: "Requested during incident triage",
    });

    expect(result.ok).toBe(false);
    expect(getFlag(ENABLED_FLAG)?.enabled).toBe(true);
  });

  it.each(["reviewer", "readonly"] as const)("%s cannot change rollout", async (role) => {
    signInAs(role);
    const result = await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "rollout", rollout: 5 },
      reason: "Requested during incident triage",
    });

    expect(result.ok).toBe(false);
    expect(getFlag(ENABLED_FLAG)?.rollout).toBe(75);
  });

  it("records the refused attempt as denied, not success", async () => {
    signInAs("reviewer");
    await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "toggle", enabled: false },
      reason: "Requested during incident triage",
    });

    const events = listAuditEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      role: "reviewer",
      outcome: "denied",
      reason: "Requested during incident triage",
    });
    expect(events[0].after).toBeUndefined();
  });
});

describe("mid-rollout definition", () => {
  it("counts only production flags that are on and partially rolled out", () => {
    const flags = listFlags();
    const counted = midRollout(flags);

    expect(counted.length).toBeGreaterThan(0);
    expect(counted.every((flag) => flag.environment === "production")).toBe(true);
    expect(counted.every((flag) => flag.enabled && flag.rollout > 0 && flag.rollout < 100)).toBe(
      true,
    );
    expect(
      flags.some((flag) => flag.environment === "staging" && isPartialRollout(flag)),
    ).toBe(true);
  });
});

describe("input guards", () => {
  it("requires a reason", async () => {
    const result = await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "toggle", enabled: false },
      reason: " ",
    });

    expect(result).toMatchObject({ ok: false });
    expect(getFlag(ENABLED_FLAG)?.enabled).toBe(true);
    expect(listAuditEvents()).toHaveLength(0);
  });

  it.each([-1, 101, 12.5])("rejects an out-of-range rollout of %s", async (rollout) => {
    const result = await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "rollout", rollout },
      reason: "Typed the wrong number",
    });

    expect(result).toMatchObject({ ok: false });
    expect(getFlag(ENABLED_FLAG)?.rollout).toBe(75);
    expect(listAuditEvents()).toHaveLength(0);
  });

  it("rejects a change that would not change anything", async () => {
    const result = await changeFlag({
      key: ENABLED_FLAG,
      change: { type: "toggle", enabled: true },
      reason: "Double submit",
    });

    expect(result).toMatchObject({ ok: false });
    expect(listAuditEvents()).toHaveLength(0);
  });

  it("reports an unknown flag without writing an audit event", async () => {
    const result = await changeFlag({
      key: "does_not_exist",
      change: { type: "toggle", enabled: true },
      reason: "Does not exist",
    });

    expect(result).toMatchObject({ ok: false });
    expect(listAuditEvents()).toHaveLength(0);
  });
});
