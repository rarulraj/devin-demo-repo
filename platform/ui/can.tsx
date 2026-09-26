import type { ReactNode } from "react";
import { can, type Permission, type Role } from "../rbac";

/**
 * Presentation-level guard. Hiding UI is a convenience, not the control:
 * authorization is enforced server-side in `mutate()`.
 */
export function Can({
  role,
  permission,
  children,
  fallback = null,
}: {
  role: Role;
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <>{can(role, permission) ? children : fallback}</>;
}
