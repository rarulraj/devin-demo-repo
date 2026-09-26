"use server";

import { revalidatePath } from "next/cache";
import { decideRefund, type RefundDecision } from "@/lib/refunds/decisions";

export type RefundDecisionResponse = { ok: boolean; message?: string };

/**
 * Server Function entry point. Reachable by direct POST, so it carries no
 * authorization of its own beyond delegating to the shared mutation path, which
 * resolves the actor server-side and refuses unauthorized operations.
 */
export async function submitRefundDecision(
  refundId: string,
  decision: RefundDecision,
  reason: string,
): Promise<RefundDecisionResponse> {
  const result = await decideRefund({ refundId, decision, reason });
  if (!result.ok) return { ok: false, message: result.error };
  revalidatePath("/refunds");
  revalidatePath("/audit");
  revalidatePath("/");
  return { ok: true };
}
