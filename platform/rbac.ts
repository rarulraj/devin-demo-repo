export const ROLES = ["admin", "reviewer", "readonly"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  reviewer: "Reviewer",
  readonly: "Read Only",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Full access, including feature flag changes",
  reviewer: "Reviews KYC cases and refund requests",
  readonly: "View-only access across all applications",
};

export const PERMISSIONS = [
  "kyc.view",
  "kyc.approve",
  "kyc.reject",
  "kyc.escalate",
  "refund.view",
  "refund.approve",
  "refund.reject",
  "flag.view",
  "flag.update",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const VIEW_PERMISSIONS: Permission[] = [
  "kyc.view",
  "refund.view",
  "flag.view",
  "audit.view",
];

const REVIEWER_PERMISSIONS: Permission[] = [
  ...VIEW_PERMISSIONS,
  "kyc.approve",
  "kyc.reject",
  "kyc.escalate",
  "refund.approve",
  "refund.reject",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  reviewer: REVIEWER_PERMISSIONS,
  readonly: VIEW_PERMISSIONS,
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  "kyc.view": "View KYC cases",
  "kyc.approve": "Approve KYC cases",
  "kyc.reject": "Reject KYC cases",
  "kyc.escalate": "Escalate KYC cases",
  "refund.view": "View refund requests",
  "refund.approve": "Approve refunds",
  "refund.reject": "Reject refunds",
  "flag.view": "View feature flags",
  "flag.update": "Change feature flags",
  "audit.view": "View the audit log",
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export class AuthorizationError extends Error {
  readonly role: Role;
  readonly permission: Permission;

  constructor(role: Role, permission: Permission) {
    super(`${ROLE_LABELS[role]} is not permitted to ${PERMISSION_LABELS[permission].toLowerCase()}`);
    this.name = "AuthorizationError";
    this.role = role;
    this.permission = permission;
  }
}

/** Server-side gate. Every mutation runs through this before touching state. */
export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) throw new AuthorizationError(role, permission);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
