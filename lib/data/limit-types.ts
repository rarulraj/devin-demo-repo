export type AccountSegment = "personal" | "sole_trader" | "business" | "enterprise";

export type LimitRequestStatus = "pending" | "approved" | "rejected";

export type LimitDecisionNote = {
  author: string;
  at: string;
  text: string;
};

/**
 * A request to move an account's daily transaction limit. The request carries
 * the limit it was raised against, so an approval cannot silently apply to a
 * different starting point than the requester saw.
 */
export type LimitRequest = {
  id: string;
  accountId: string;
  /** Minor units, like refunds: limits never travel as floats. */
  requestedLimitMinor: number;
  previousLimitMinor: number;
  justification: string;
  requestedBy: string;
  requestedAt: string;
  status: LimitRequestStatus;
  decision?: LimitDecisionNote;
};

export type Account = {
  id: string;
  customer: string;
  email: string;
  segment: AccountSegment;
  country: string;
  dailyLimitMinor: number;
  limitSetAt: string;
  limitSetBy: string;
  /** Rolling 30-day peak, so an operator can judge whether a limit binds. */
  peakDailyVolumeMinor: number;
};

export const SEGMENT_LABELS: Record<AccountSegment, string> = {
  personal: "Personal",
  sole_trader: "Sole trader",
  business: "Business",
  enterprise: "Enterprise",
};

export const LIMIT_REQUEST_STATUS_LABELS: Record<LimitRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

/** £100 to £5,000,000 a day. Anything outside that is a typo, not a decision. */
export const MIN_LIMIT_MINOR = 10_000;
export const MAX_LIMIT_MINOR = 500_000_000;

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export function formatLimit(amountMinor: number): string {
  return GBP.format(amountMinor / 100);
}

export function isPendingRequest(request: LimitRequest): boolean {
  return request.status === "pending";
}

/** Headroom the requested limit would add, as a signed percentage. */
export function limitDelta(request: LimitRequest): string {
  const change = request.requestedLimitMinor - request.previousLimitMinor;
  if (change === 0) return "No change";
  const percent = Math.round((change / request.previousLimitMinor) * 100);
  return `${change > 0 ? "+" : ""}${percent}%`;
}
