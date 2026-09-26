import { buildKycCases } from "./kyc-fixtures";
import { isOpen, type KycCase, type KycStatus, type ReviewerNote } from "./kyc-types";

/**
 * In-memory case store for the prototype. A production deployment replaces this
 * module with a database; nothing above it changes, because state changes are
 * only ever applied from inside a mutate() operation.
 */

type KycStore = { cases: KycCase[] };

const globalRef = globalThis as typeof globalThis & { __fintechOpsKyc?: KycStore };

function store(): KycStore {
  globalRef.__fintechOpsKyc ??= { cases: buildKycCases(new Date()) };
  return globalRef.__fintechOpsKyc;
}

/**
 * Queue order: work that still needs a decision first, riskiest first within
 * that, then oldest submission, so the top of the queue is always actionable.
 */
function queueOrder(a: KycCase, b: KycCase): number {
  const open = Number(isOpen(b)) - Number(isOpen(a));
  if (open !== 0) return open;
  if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
  return a.submittedAt.localeCompare(b.submittedAt);
}

export function listKycCases(): KycCase[] {
  return [...store().cases].sort(queueOrder);
}

export function getKycCase(id: string): KycCase | undefined {
  return store().cases.find((entry) => entry.id === id);
}

export class CaseStateError extends Error {}

/**
 * The state change itself. Called from inside the shared mutation path, which
 * has already resolved the actor and authorized the operation.
 */
export function applyKycDecision(
  id: string,
  status: KycStatus,
  note: ReviewerNote,
): KycCase {
  const current = getKycCase(id);
  if (!current) throw new CaseStateError(`Unknown KYC case ${id}`);
  if (!isOpen(current)) {
    throw new CaseStateError(`${id} was already ${current.status} and cannot be changed`);
  }

  const updated: KycCase = {
    ...current,
    status,
    assignee: note.author,
    notes: [note, ...current.notes],
  };
  store().cases = store().cases.map((entry) => (entry.id === id ? updated : entry));
  return updated;
}

/** Test-only hook so each test starts from the same fixtures. */
export function resetKycCases(seededAt: Date = new Date()): void {
  globalRef.__fintechOpsKyc = { cases: buildKycCases(seededAt) };
}
