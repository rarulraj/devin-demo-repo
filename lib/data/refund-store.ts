import { buildRefunds } from "./refund-fixtures";
import {
  isPending,
  type DecisionNote,
  type RefundRequest,
  type RefundStatus,
} from "./refund-types";

/**
 * In-memory refund store for the prototype, mirroring the KYC store: state is
 * only ever changed from inside a mutate() operation, so swapping this module
 * for a database changes nothing above it.
 */

type RefundStore = { refunds: RefundRequest[] };

const globalRef = globalThis as typeof globalThis & { __fintechOpsRefunds?: RefundStore };

function store(): RefundStore {
  globalRef.__fintechOpsRefunds ??= { refunds: buildRefunds(new Date()) };
  return globalRef.__fintechOpsRefunds;
}

/**
 * Queue order: undecided requests first, largest amount first within that, then
 * oldest submission. Money at risk is the refund equivalent of a risk score.
 */
function queueOrder(a: RefundRequest, b: RefundRequest): number {
  const pending = Number(isPending(b)) - Number(isPending(a));
  if (pending !== 0) return pending;
  if (b.amountMinor !== a.amountMinor) return b.amountMinor - a.amountMinor;
  return a.submittedAt.localeCompare(b.submittedAt);
}

export function listRefunds(): RefundRequest[] {
  return [...store().refunds].sort(queueOrder);
}

export function getRefund(id: string): RefundRequest | undefined {
  return store().refunds.find((entry) => entry.id === id);
}

export class RefundStateError extends Error {}

/**
 * The state change itself. Called from inside the shared mutation path, which
 * has already resolved the actor and authorized the operation.
 */
export function applyRefundDecision(
  id: string,
  status: RefundStatus,
  note: DecisionNote,
): RefundRequest {
  const current = getRefund(id);
  if (!current) throw new RefundStateError(`Unknown refund ${id}`);
  if (!isPending(current)) {
    throw new RefundStateError(`${id} was already ${current.status} and cannot be changed`);
  }

  const updated: RefundRequest = {
    ...current,
    status,
    notes: [note, ...current.notes],
  };
  store().refunds = store().refunds.map((entry) => (entry.id === id ? updated : entry));
  return updated;
}

/** Test-only hook so each test starts from the same fixtures. */
export function resetRefunds(seededAt: Date = new Date()): void {
  globalRef.__fintechOpsRefunds = { refunds: buildRefunds(seededAt) };
}
