"use server";

import { revalidatePath } from "next/cache";
import { changeFlag, type FlagChange } from "@/lib/flags/changes";

export type FlagChangeResponse = { ok: boolean; message?: string };

/**
 * Server Function entry point. Reachable by direct POST, so it carries no
 * authorization of its own beyond delegating to the shared mutation path, which
 * resolves the actor server-side and refuses unauthorized operations.
 */
export async function submitFlagChange(
  key: string,
  change: FlagChange,
  reason: string,
): Promise<FlagChangeResponse> {
  const result = await changeFlag({ key, change, reason });
  if (!result.ok) return { ok: false, message: result.error };
  revalidatePath("/flags");
  revalidatePath("/audit");
  revalidatePath("/");
  return { ok: true };
}
