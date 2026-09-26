export type KycStatus = "pending" | "approved" | "rejected" | "escalated";

export type RiskLevel = "low" | "medium" | "high";

export type CheckState = "passed" | "failed" | "needs_review";

export type CheckKey = "identity" | "sanctions" | "address" | "document";

export type VerificationCheck = {
  key: CheckKey;
  label: string;
  state: CheckState;
  /** Why the check landed in this state, in the reviewer's language. */
  detail: string;
};

export type ReviewerNote = {
  author: string;
  at: string;
  text: string;
};

export type KycCase = {
  id: string;
  customer: string;
  email: string;
  country: string;
  submittedAt: string;
  riskScore: number;
  status: KycStatus;
  assignee: string;
  checks: VerificationCheck[];
  riskFactors: string[];
  notes: ReviewerNote[];
};

/** Risk level is derived from the score, never stored separately from it. */
export function riskLevel(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const STATUS_LABELS: Record<KycStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  escalated: "Escalated",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const CHECK_STATE_LABELS: Record<CheckState, string> = {
  passed: "Passed",
  failed: "Failed",
  needs_review: "Needs review",
};

/** Cases a reviewer still has to act on, in the order the queue should show them. */
export const OPEN_STATUSES: readonly KycStatus[] = ["escalated", "pending"];

export function isOpen(kycCase: KycCase): boolean {
  return OPEN_STATUSES.includes(kycCase.status);
}
