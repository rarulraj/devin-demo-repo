import { cookies } from "next/headers";
import { isRole, type Role } from "./rbac";

export type SimulatedUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  team: string;
  role: Role;
};

export const ROLE_COOKIE = "fintech-ops-role";

const USERS: Record<Role, SimulatedUser> = {
  admin: {
    id: "u_admin",
    name: "Dana Whitfield",
    email: "dana.whitfield@northlane.example",
    initials: "DW",
    team: "Platform Engineering",
    role: "admin",
  },
  reviewer: {
    id: "u_reviewer",
    name: "Marcus Adeyemi",
    email: "marcus.adeyemi@northlane.example",
    initials: "MA",
    team: "Financial Crime Ops",
    role: "reviewer",
  },
  readonly: {
    id: "u_readonly",
    name: "Priya Raman",
    email: "priya.raman@northlane.example",
    initials: "PR",
    team: "Internal Audit",
    role: "readonly",
  },
};

export const DEFAULT_ROLE: Role = "reviewer";

export function userForRole(role: Role): SimulatedUser {
  return USERS[role];
}

/**
 * Simulated session for the prototype. A real deployment would resolve this
 * from the identity provider; every consumer below stays unchanged.
 */
export async function getSession(): Promise<SimulatedUser> {
  const store = await cookies();
  const value = store.get(ROLE_COOKIE)?.value;
  return userForRole(isRole(value) ? value : DEFAULT_ROLE);
}
