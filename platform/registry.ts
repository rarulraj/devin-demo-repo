import { FileSearch, Flag, Gauge, LayoutGrid, ReceiptText, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission } from "./rbac";

/** Delivery state of an application, not a statement about who may use it. */
export type AppStatus = "available" | "planned";

export type AppKind = "business" | "platform";

export type RegisteredApp = {
  id: string;
  name: string;
  href: string;
  icon: LucideIcon;
  /** One line shown on the Overview page and as the nav tooltip. */
  summary: string;
  owner: string;
  kind: AppKind;
  /**
   * Permissions this app mutates through. Every role may read every
   * application; roles differ only in which of these actions they may perform.
   */
  writePermissions: readonly Permission[];
  status: AppStatus;
};

/**
 * Single source of truth for the application catalog.
 * Navigation, the Overview page and access checks are all derived from this list,
 * so registering a new internal application is a one-entry change.
 */
export const APP_REGISTRY = [
  {
    id: "overview",
    name: "Overview",
    href: "/",
    icon: LayoutGrid,
    summary: "Operational snapshot across all internal applications",
    owner: "Internal Tools",
    kind: "platform",
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
    kind: "business",
    writePermissions: ["kyc.approve", "kyc.reject", "kyc.escalate"],
    status: "available",
  },
  {
    id: "refunds",
    name: "Refunds",
    href: "/refunds",
    icon: ReceiptText,
    summary: "Refund requests awaiting operations approval",
    owner: "Payments Ops",
    kind: "business",
    writePermissions: ["refund.approve", "refund.reject"],
    status: "available",
  },
  {
    id: "flags",
    name: "Feature Flags",
    href: "/flags",
    icon: Flag,
    summary: "Runtime configuration for product and risk systems",
    owner: "Platform Engineering",
    kind: "business",
    writePermissions: ["flag.update"],
    status: "available",
  },
  {
    id: "limits",
    name: "Transaction Limits",
    href: "/limits",
    icon: Gauge,
    summary: "Daily transaction limits and pending limit-change requests",
    owner: "Risk Operations",
    kind: "business",
    writePermissions: ["limit.request", "limit.approve", "limit.reject"],
    status: "available",
  },
  {
    id: "audit",
    name: "Audit Log",
    href: "/audit",
    icon: ScrollText,
    summary: "Immutable record of every privileged action",
    owner: "Internal Tools",
    kind: "platform",
    writePermissions: [],
    status: "available",
  },
] as const satisfies readonly RegisteredApp[];

/** Derived from the registry, so an unregistered id cannot be constructed. */
export type AppId = (typeof APP_REGISTRY)[number]["id"];

export function findApp(id: string): RegisteredApp | undefined {
  return APP_REGISTRY.find((entry) => entry.id === id);
}

/** For pages that belong to a known application; the id type rules out typos. */
export function getApp(id: AppId): RegisteredApp {
  return findApp(id)!;
}

/**
 * Display name for any audit source. System events are not registered
 * applications, so the audit log labels them rather than failing to render.
 */
export function appLabel(id: string): string {
  return findApp(id)?.name ?? "Platform";
}

/** Apps shown in the left navigation, in registration order. */
export const NAV_APPS: readonly RegisteredApp[] = APP_REGISTRY;

/** The internal tools themselves, as opposed to platform surfaces. */
export const BUSINESS_APPS: readonly RegisteredApp[] = APP_REGISTRY.filter(
  (app) => app.kind === "business",
);
