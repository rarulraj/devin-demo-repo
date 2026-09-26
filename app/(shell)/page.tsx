import { ArrowRight, Check, Minus } from "lucide-react";
import Link from "next/link";
import { ensureSeedData } from "@/lib/data/seed";
import { formatRelative } from "@/lib/utils";
import { auditActivity, listAuditEvents } from "@/platform/audit";
import {
  PERMISSION_LABELS,
  ROLE_LABELS,
  can,
  type Permission,
  type Role,
} from "@/platform/rbac";
import { APP_REGISTRY, BUSINESS_APPS, type RegisteredApp } from "@/platform/registry";
import { getSession } from "@/platform/session";
import { DataTable, type Column } from "@/platform/ui/data-table";
import { PageHeader } from "@/platform/ui/page-header";
import { Panel } from "@/platform/ui/panel";
import { StatusBadge } from "@/platform/ui/status-badge";

function accessLabel(app: RegisteredApp, role: Role) {
  if (app.writePermissions.length === 0) return { label: "View", tone: "neutral" as const };
  const granted = app.writePermissions.filter((permission) => can(role, permission));
  if (granted.length === app.writePermissions.length)
    return { label: "Full access", tone: "success" as const };
  if (granted.length > 0) return { label: "Partial access", tone: "warning" as const };
  return { label: "View only", tone: "neutral" as const };
}

export default async function OverviewPage() {
  ensureSeedData();
  const user = await getSession();
  const events = listAuditEvents();
  const activity = auditActivity(24);

  const metrics = [
    { label: "Registered applications", value: APP_REGISTRY.length, hint: "in the app registry" },
    {
      label: "Implemented",
      value: APP_REGISTRY.filter((app) => app.status === "available").length,
      hint: `of ${APP_REGISTRY.length} in this build`,
    },
    { label: "Audited actions (24h)", value: activity.total, hint: "across all applications" },
    { label: "Denied by RBAC (24h)", value: activity.denied, hint: "blocked server-side" },
  ];

  const columns: Column<RegisteredApp>[] = [
    {
      key: "name",
      header: "Application",
      width: "w-[30%]",
      cell: (app) => (
        <div className="flex items-start gap-2">
          <app.icon aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 text-ink-subtle" />
          <div>
            <div className="font-medium text-ink">{app.name}</div>
            <div className="text-[12px] text-ink-muted">{app.summary}</div>
          </div>
        </div>
      ),
    },
    { key: "owner", header: "Owning team", cell: (app) => app.owner },
    {
      key: "status",
      header: "Build status",
      cell: (app) =>
        app.status === "available" ? (
          <StatusBadge tone="success">Implemented</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Not implemented</StatusBadge>
        ),
    },
    {
      key: "access",
      header: `Access as ${ROLE_LABELS[user.role]}`,
      cell: (app) => {
        const access = accessLabel(app, user.role);
        return <StatusBadge tone={access.tone}>{access.label}</StatusBadge>;
      },
    },
    {
      key: "open",
      header: "Open",
      headerSrOnly: true,
      align: "right",
      width: "w-[80px]",
      cell: (app) => (
        <Link
          href={app.href}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline"
        >
          Open
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      ),
    },
  ];

  const permissionGroups: { app: string; permissions: Permission[] }[] = BUSINESS_APPS.map(
    (app) => ({
      app: app.name,
      permissions: app.writePermissions,
    }),
  );

  return (
    <>
      <PageHeader
        title="Overview"
        description="Shared operations console for Northlane internal tools. Applications register into one shell and inherit the same navigation, authorization and audit trail."
      />

      <div className="space-y-4 p-6">
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-[4px] border border-line bg-line">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-surface px-4 py-3">
              <p className="text-[11.5px] uppercase tracking-[0.05em] text-ink-muted">
                {metric.label}
              </p>
              <p className="mt-1 text-[22px] font-semibold leading-7 text-ink tabular">
                {metric.value}
              </p>
              <p className="text-[11.5px] text-ink-subtle">{metric.hint}</p>
            </div>
          ))}
        </div>

        <Panel
          title="Applications"
          description="Navigation, access checks and this table are all generated from the shared application registry."
        >
          <DataTable
            ariaLabel="Registered applications"
            columns={columns}
            rows={APP_REGISTRY.filter((app) => app.id !== "overview")}
            getRowId={(app) => app.id}
          />
        </Panel>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-4">
          <Panel
            title={`Your permissions · ${ROLE_LABELS[user.role]}`}
            description="Evaluated server-side before any state change."
          >
            <ul className="divide-y divide-line border-t border-line">
              {permissionGroups.map((group) => (
                <li key={group.app} className="px-4 py-2">
                  <p className="text-[12px] font-medium text-ink">{group.app}</p>
                  <ul className="mt-1 space-y-0.5">
                    {group.permissions.map((permission) => {
                      const allowed = can(user.role, permission);
                      return (
                        <li
                          key={permission}
                          className="flex items-center gap-1.5 text-[12.5px] text-ink-muted"
                        >
                          {allowed ? (
                            <Check aria-hidden className="size-3.5 text-success" />
                          ) : (
                            <Minus aria-hidden className="size-3.5 text-ink-subtle" />
                          )}
                          <span className={allowed ? "text-ink" : "text-ink-subtle"}>
                            {PERMISSION_LABELS[permission]}
                          </span>
                          <span className="sr-only">{allowed ? "allowed" : "not allowed"}</span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Recent platform activity"
            description="Every privileged action, including denied attempts."
            actions={
              <Link
                href="/audit"
                className="text-[12.5px] font-medium text-accent hover:underline"
              >
                View audit log
              </Link>
            }
          >
            <ul className="divide-y divide-line border-t border-line">
              {events.slice(0, 6).map((event) => (
                <li key={event.id} className="flex items-baseline gap-3 px-4 py-2">
                  <span className="w-[68px] shrink-0 text-[12px] text-ink-subtle tabular">
                    {formatRelative(event.at)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[12.5px] text-ink">
                      <span className="font-medium">{event.actor}</span> · {event.action}
                    </span>
                    <span className="block truncate text-[12px] text-ink-muted">
                      {event.entityLabel}
                    </span>
                  </span>
                  <StatusBadge tone={event.outcome === "success" ? "neutral" : "danger"} dot={false}>
                    {event.outcome === "success" ? "Success" : "Denied"}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
