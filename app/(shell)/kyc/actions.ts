"use server";

import { revalidatePath } from "next/cache";
import { decideKycCase, type KycDecision } from "@/lib/kyc/decisions";

export type DecisionResponse = { ok: boolean; message?: string };

/**
 * Server Function entry point. Reachable by direct POST, so it carries no
 * authorization of its own beyond delegating to the shared mutation path, which
 * resolves the actor server-side and refuses unauthorized operations.
 */
export async function submitKycDecision(
  caseId: string,
  decision: KycDecision,
  reason: string,
): Promise<DecisionResponse> {
  const result = await decideKycCase({ caseId, decision, reason });
  if (!result.ok) return { ok: false, message: result.error };
  revalidatePath("/kyc");
  revalidatePath("/audit");
  revalidatePath("/");
  return { ok: true };
}
