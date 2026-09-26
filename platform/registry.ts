import { FileSearch, Flag, LayoutGrid, ReceiptText, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission } from "./rbac";

export type AppStatus = "available" | "not-implemented";

export type AppId = "overview" | "kyc" | "refunds" | "flags" | "audit" | "platform";

export type RegisteredApp = {
  id: AppId;
  name: string;
  href: string;
  icon: LucideIcon;
  /** One line shown on the Overview page and as the nav tooltip. */
  summary: string;
  owner: string;
  /** Permission required to see the app at all. */
  viewPermission: Permission | null;
  /** Permissions this app mutates through, surfaced on Overview for explainability. */
  writePermissions: Permission[];
  status: AppStatus;
};

/**
 * Single source of truth for the application catalog.
 * Navigation, the Overview page and access checks are all derived from this list,
 * so registering a new internal application is a one-entry change.
 */
export const APP_REGISTRY: RegisteredApp[] = [
  {
    id: "overview",
    name: "Overview",
    href: "/",
    icon: LayoutGrid,
    summary: "Operational snapshot across all internal applications",
    owner: "Internal Tools",
    viewPermission: null,
    writePermissions: [],
    status: "available",
  },
  {
    id: "kyc",
    name: "KYC Reviews",
    href: "/kyc",
    icon: FileSearch,
    summary: "Identity verification queue for onboarding customers",
    owner: "Financial Crime Ops",
    viewPermission: "kyc.view",
    writePermissions: ["kyc.approve", "kyc.reject", "kyc.escalate"],
    status: "not-implemented",
  },
  {
    id: "refunds",
    name: "Refunds",
    href: "/refunds",
    icon: ReceiptText,
    summary: "Refund requests awaiting operations approval",
    owner: "Payments Ops",
    viewPermission: "refund.view",
    writePermissions: ["refund.approve", "refund.reject"],
    status: "not-implemented",
  },
  {
    id: "flags",
    name: "Feature Flags",
    href: "/flags",
    icon: Flag,
    summary: "Runtime configuration for product and risk systems",
    owner: "Platform Engineering",
    viewPermission: "flag.view",
    writePermissions: ["flag.update"],
    status: "not-implemented",
  },
  {
    id: "audit",
    name: "Audit Log",
    href: "/audit",
    icon: ScrollText,
    summary: "Immutable record of every privileged action",
    owner: "Internal Tools",
    viewPermission: "audit.view",
    writePermissions: [],
    status: "available",
  },
];

export function getApp(id: AppId): RegisteredApp {
  const app = APP_REGISTRY.find((entry) => entry.id === id);
  if (!app) throw new Error(`Unknown application: ${id}`);
  return app;
}

/** Apps shown in the left navigation, in registration order. */
export const NAV_APPS = APP_REGISTRY;

/** Business applications, i.e. everything except platform-level surfaces. */
export const BUSINESS_APPS = APP_REGISTRY.filter(
  (app) => app.id !== "overview" && app.id !== "audit",
);
