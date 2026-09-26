import { buildFlags } from "./flag-fixtures";
import { isProduction, type FeatureFlag, type FlagChangeNote } from "./flag-types";

/**
 * In-memory feature flag store for the prototype, mirroring the KYC and refund
 * stores: state only ever changes from inside a mutate() operation.
 */

type FlagStore = { flags: FeatureFlag[] };

const globalRef = globalThis as typeof globalThis & { __fintechOpsFlags?: FlagStore };

function store(): FlagStore {
  globalRef.__fintechOpsFlags ??= { flags: buildFlags(new Date()) };
  return globalRef.__fintechOpsFlags;
}

/** Production first, then most recently changed: blast radius, then recency. */
function listOrder(a: FeatureFlag, b: FeatureFlag): number {
  const environment = Number(isProduction(b)) - Number(isProduction(a));
  if (environment !== 0) return environment;
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function listFlags(): FeatureFlag[] {
  return [...store().flags].sort(listOrder);
}

export function getFlag(key: string): FeatureFlag | undefined {
  return store().flags.find((entry) => entry.key === key);
}

export class FlagStateError extends Error {}

export type FlagStateChange = { enabled: boolean } | { rollout: number };

/**
 * The state change itself. Called from inside the shared mutation path, which
 * has already resolved the actor and authorized the operation.
 */
export function applyFlagChange(
  key: string,
  change: FlagStateChange,
  note: FlagChangeNote,
): FeatureFlag {
  const current = getFlag(key);
  if (!current) throw new FlagStateError(`Unknown feature flag ${key}`);

  const updated: FeatureFlag = {
    ...current,
    ...change,
    updatedAt: note.at,
    history: [note, ...current.history],
  };
  store().flags = store().flags.map((entry) => (entry.key === key ? updated : entry));
  return updated;
}

/** Test-only hook so each test starts from the same fixtures. */
export function resetFlags(seededAt: Date = new Date()): void {
  globalRef.__fintechOpsFlags = { flags: buildFlags(seededAt) };
}
