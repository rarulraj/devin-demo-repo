"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isRole } from "@/platform/rbac";
import { ROLE_COOKIE } from "@/platform/session";

/** Demo-only role switch. Real deployments resolve the role from the IdP. */
export async function setRole(role: string): Promise<void> {
  if (!isRole(role)) throw new Error(`Unknown role: ${role}`);
  const store = await cookies();
  store.set(ROLE_COOKIE, role, { path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
}
