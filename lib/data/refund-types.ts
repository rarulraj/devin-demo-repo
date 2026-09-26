export type RefundStatus = "pending" | "approved" | "rejected";

export type RefundCategory =
  | "duplicate_charge"
  | "failed_delivery"
  | "fraud_claim"
  | "service_issue"
  | "subscription"
  | "price_error";

export type DecisionNote = {
  author: string;
  at: string;
  text: string;
};

export type RefundRequest = {
  id: string;
  customer: string;
  email: string;
  transactionId: string;
  /** Minor units. Money never moves through a float. */
  amountMinor: number;
  currency: "GBP";
  category: RefundCategory;
  /** What the customer said when they asked for the money back. */
  customerReason: string;
  /** What operations already knows about the charge, for context. */
  context: string[];
  paymentMethod: string;
  chargedAt: string;
  submittedAt: string;
  status: RefundStatus;
  requestedBy: string;
  notes: DecisionNote[];
};

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const REFUND_CATEGORY_LABELS: Record<RefundCategory, string> = {
  duplicate_charge: "Duplicate charge",
  failed_delivery: "Failed delivery",
  fraud_claim: "Fraud claim",
  service_issue: "Service issue",
  subscription: "Subscription",
  price_error: "Price error",
};

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export function formatAmount(amountMinor: number): string {
  return GBP.format(amountMinor / 100);
}

export function isPending(refund: RefundRequest): boolean {
  return refund.status === "pending";
}
