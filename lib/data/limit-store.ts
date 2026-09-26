import { buildAccounts, buildLimitRequests } from "./limit-fixtures";
import {
  isPendingRequest,
  type Account,
  type LimitDecisionNote,
  type LimitRequest,
  type LimitRequestStatus,
} from "./limit-types";

/**
 * In-memory account and limit-request store, same shape as the KYC, refund and
 * flag stores: nothing here is called except from inside a mutate() operation,
 * so replacing it with a database leaves the layers above untouched.
 */

type LimitStore = { accounts: Account[]; requests: LimitRequest[]; nextRequest: number };

const globalRef = globalThis as typeof globalThis & { __fintechOpsLimits?: LimitStore };

function seed(seededAt: Date): LimitStore {
  return {
    accounts: buildAccounts(seededAt),
    requests: buildLimitRequests(seededAt),
    nextRequest: 3200,
  };
}

function store(): LimitStore {
  globalRef.__fintechOpsLimits ??= seed(new Date());
  return globalRef.__fintechOpsLimits;
}

/** Accounts with an open request first, then the largest limit. */
function queueOrder(a: Account, b: Account): number {
  const pending = Number(hasPendingRequest(b.id)) - Number(hasPendingRequest(a.id));
  if (pending !== 0) return pending;
  return b.dailyLimitMinor - a.dailyLimitMinor;
}

export function listAccounts(): Account[] {
  return [...store().accounts].sort(queueOrder);
}

export function getAccount(id: string): Account | undefined {
  return store().accounts.find((entry) => entry.id === id);
}

export function listRequests(accountId?: string): LimitRequest[] {
  const all = accountId
    ? store().requests.filter((entry) => entry.accountId === accountId)
    : store().requests;
  return [...all].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function getRequest(id: string): LimitRequest | undefined {
  return store().requests.find((entry) => entry.id === id);
}

export function pendingRequestFor(accountId: string): LimitRequest | undefined {
  return store().requests.find(
    (entry) => entry.accountId === accountId && isPendingRequest(entry),
  );
}

export function hasPendingRequest(accountId: string): boolean {
  return pendingRequestFor(accountId) !== undefined;
}

export class LimitStateError extends Error {}

/** Records a new request. One account may only have one open request at a time. */
export function addLimitRequest(input: {
  accountId: string;
  requestedLimitMinor: number;
  requestedBy: string;
  requestedAt: string;
  justification: string;
}): LimitRequest {
  const account = getAccount(input.accountId);
  if (!account) throw new LimitStateError(`Unknown account ${input.accountId}`);
  if (hasPendingRequest(account.id)) {
    throw new LimitStateError(`${account.id} already has a limit request awaiting a decision`);
  }

  const state = store();
  state.nextRequest += 1;
  const request: LimitRequest = {
    id: `LR-${state.nextRequest}`,
    accountId: account.id,
    requestedLimitMinor: input.requestedLimitMinor,
    previousLimitMinor: account.dailyLimitMinor,
    justification: input.justification,
    requestedBy: input.requestedBy,
    requestedAt: input.requestedAt,
    status: "pending",
  };
  state.requests = [request, ...state.requests];
  return request;
}

/**
 * Decides an open request. Approval is the only path that moves an account's
 * limit, and it applies the limit the request was raised against.
 */
export function applyLimitDecision(
  requestId: string,
  status: Exclude<LimitRequestStatus, "pending">,
  note: LimitDecisionNote,
): LimitRequest {
  const current = getRequest(requestId);
  if (!current) throw new LimitStateError(`Unknown limit request ${requestId}`);
  if (!isPendingRequest(current)) {
    throw new LimitStateError(`${requestId} was already ${current.status} and cannot be changed`);
  }

  const decided: LimitRequest = { ...current, status, decision: note };
  const state = store();
  state.requests = state.requests.map((entry) => (entry.id === requestId ? decided : entry));

  if (status === "approved") {
    state.accounts = state.accounts.map((account) =>
      account.id === current.accountId
        ? {
            ...account,
            dailyLimitMinor: current.requestedLimitMinor,
            limitSetAt: note.at,
            limitSetBy: note.author,
          }
        : account,
    );
  }

  return decided;
}

/** Test-only hook so each test starts from the same fixtures. */
export function resetLimits(seededAt: Date = new Date()): void {
  globalRef.__fintechOpsLimits = seed(seededAt);
}
