import type { FeatureFlag, FlagEnvironment } from "./flag-types";

/**
 * Deterministic fictional feature flags for the prototype.
 *
 * Each one reads like runtime configuration an operations or platform engineer
 * would actually be asked about during an incident: what it controls, who owns
 * it, how much traffic sees it, and why it was last changed.
 */

type Fixture = {
  key: string;
  name: string;
  description: string;
  environment: FlagEnvironment;
  enabled: boolean;
  rollout: number;
  owner: string;
  /** Hours before seed time; keeps the list looking live without random data. */
  updatedHoursAgo: number;
  history?: { author: string; hoursAgo: number; change: string; text: string }[];
};

const FIXTURES: Fixture[] = [
  {
    key: "instant_payouts",
    name: "Instant payouts",
    description: "Settles merchant payouts within minutes instead of the nightly batch.",
    environment: "production",
    enabled: false,
    rollout: 25,
    owner: "Payments Platform",
    updatedHoursAgo: 9,
    history: [
      {
        author: "Dana Whitfield",
        hoursAgo: 9,
        change: "Enabled → Disabled",
        text: "INC-2291 payout latency mitigation",
      },
      {
        author: "Dana Whitfield",
        hoursAgo: 190,
        change: "Rollout 10% → 25%",
        text: "Expanded after a clean week on the first cohort",
      },
    ],
  },
  {
    key: "kyc_auto_approve_low_risk",
    name: "Auto-approve low-risk KYC",
    description:
      "Clears onboarding cases scoring under 20 with all four verification checks passed.",
    environment: "production",
    enabled: true,
    rollout: 40,
    owner: "Financial Crime Ops",
    updatedHoursAgo: 61,
    history: [
      {
        author: "Dana Whitfield",
        hoursAgo: 61,
        change: "Rollout 20% → 40%",
        text: "Compliance sign-off on the first 500 auto-approvals",
      },
    ],
  },
  {
    key: "refund_auto_approve_under_50",
    name: "Auto-approve refunds under £50",
    description: "Approves duplicate-charge refunds below £50 without an operator decision.",
    environment: "production",
    enabled: false,
    rollout: 0,
    owner: "Payments Ops",
    updatedHoursAgo: 340,
    history: [
      {
        author: "Dana Whitfield",
        hoursAgo: 340,
        change: "Enabled → Disabled",
        text: "Paused pending the refund abuse review",
      },
    ],
  },
  {
    key: "sanctions_screening_v3",
    name: "Sanctions screening v3",
    description: "Routes screening to the v3 provider with fuzzy name matching.",
    environment: "production",
    enabled: true,
    rollout: 100,
    owner: "Financial Crime Ops",
    updatedHoursAgo: 712,
    history: [
      {
        author: "Dana Whitfield",
        hoursAgo: 712,
        change: "Rollout 60% → 100%",
        text: "Match rates matched v2 across the full shadow run",
      },
    ],
  },
  {
    key: "card_3ds_step_up",
    name: "3DS step-up on high-risk cards",
    description: "Forces a 3-D Secure challenge when the risk engine scores a payment above 70.",
    environment: "production",
    enabled: true,
    rollout: 75,
    owner: "Risk Engineering",
    updatedHoursAgo: 28,
    history: [
      {
        author: "Dana Whitfield",
        hoursAgo: 28,
        change: "Rollout 50% → 75%",
        text: "Fraud rate down 18% on the challenged cohort",
      },
    ],
  },
  {
    key: "ops_console_bulk_actions",
    name: "Bulk actions in the ops console",
    description: "Lets operators decide several queue items in one action.",
    environment: "production",
    enabled: false,
    rollout: 0,
    owner: "Internal Tools",
    updatedHoursAgo: 520,
  },
  {
    key: "merchant_statement_redesign",
    name: "Merchant statement redesign",
    description: "New statement layout with per-fee breakdown.",
    environment: "production",
    enabled: true,
    rollout: 10,
    owner: "Merchant Experience",
    updatedHoursAgo: 96,
    history: [
      {
        author: "Dana Whitfield",
        hoursAgo: 96,
        change: "Disabled → Enabled",
        text: "Opened to the internal merchant cohort",
      },
    ],
  },
  {
    key: "ledger_double_write",
    name: "Ledger double-write",
    description: "Writes every posting to both the legacy ledger and the new ledger service.",
    environment: "staging",
    enabled: true,
    rollout: 100,
    owner: "Core Banking",
    updatedHoursAgo: 46,
  },
  {
    key: "payout_retry_backoff",
    name: "Payout retry backoff",
    description: "Exponential backoff instead of fixed five-minute payout retries.",
    environment: "staging",
    enabled: true,
    rollout: 50,
    owner: "Payments Platform",
    updatedHoursAgo: 152,
    history: [
      {
        author: "Dana Whitfield",
        hoursAgo: 152,
        change: "Rollout 25% → 50%",
        text: "Soak test clean for 48 hours",
      },
    ],
  },
  {
    key: "dispute_evidence_upload",
    name: "Dispute evidence upload",
    description: "Allows merchants to attach evidence files to a dispute directly.",
    environment: "staging",
    enabled: false,
    rollout: 0,
    owner: "Disputes",
    updatedHoursAgo: 264,
  },
];

export function buildFlags(seededAt: Date): FeatureFlag[] {
  const base = seededAt.getTime();
  const hoursBefore = (hours: number) => new Date(base - hours * 3_600_000).toISOString();

  return FIXTURES.map((fixture) => ({
    key: fixture.key,
    name: fixture.name,
    description: fixture.description,
    environment: fixture.environment,
    enabled: fixture.enabled,
    rollout: fixture.rollout,
    owner: fixture.owner,
    updatedAt: hoursBefore(fixture.updatedHoursAgo),
    history: (fixture.history ?? []).map((entry) => ({
      author: entry.author,
      at: hoursBefore(entry.hoursAgo),
      change: entry.change,
      text: entry.text,
    })),
  }));
}
