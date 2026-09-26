"use server";

import { revalidatePath } from "next/cache";
import {
  decideLimitRequest,
  requestLimitChange,
  type LimitDecision,
} from "@/lib/limits/requests";

export type LimitActionResponse = { ok: boolean; message?: string };

/**
 * Server Function entry points. Both are reachable by direct POST, so neither
 * carries authorization of its own: they delegate to the shared mutation path,
 * which resolves the actor server-side and refuses unauthorized operations.
 */

function revalidate(): void {
  revalidatePath("/limits");
  revalidatePath("/audit");
  revalidatePath("/");
}

export async function submitLimitRequest(
  accountId: string,
  requestedLimitMinor: number,
  justification: string,
): Promise<LimitActionResponse> {
  const result = await requestLimitChange({ accountId, requestedLimitMinor, justification });
  if (!result.ok) return { ok: false, message: result.error };
  revalidate();
  return { ok: true };
}

export async function submitLimitDecision(
  requestId: string,
  decision: LimitDecision,
  reason: string,
): Promise<LimitActionResponse> {
  const result = await decideLimitRequest({ requestId, decision, reason });
  if (!result.ok) return { ok: false, message: result.error };
  revalidate();
  return { ok: true };
}
