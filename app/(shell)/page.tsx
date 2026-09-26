import { ArrowRight, Check, Minus } from "lucide-react";
import Link from "next/link";
import { listFlags } from "@/lib/data/flag-store";
import { isProduction, midRollout } from "@/lib/data/flag-types";
import { listKycCases } from "@/lib/data/kyc-store";
import { isOpen, riskLevel } from "@/lib/data/kyc-types";
import { listRefunds } from "@/lib/data/refund-store";
import { formatAmount, isPending } from "@/lib/data/refund-types";
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
import { BUSINESS_APPS, type RegisteredApp } from "@/platform/registry";
import { getSession } from "@/platform/session";
import { DataTable, type Column } from "@/platform/ui/data-table";
import { PageHeader } from "@/platform/ui/page-header";
import { Panel } from "@/platform/ui/panel";
import { StatusBadge } from "@/platform/ui/status-badge";

function actionAccess(app: RegisteredApp, role: Role) {
  const total = app.writePermissions.length;
  const granted = app.writePermissions.filter((permission) => can(role, permission)).length;
  if (total === 0 || granted === 0) return { label: "View only", tone: "neutral" as const };
  const noun = total === 1 ? "action" : "actions";
  if (granted === total) return { label: `All ${total} ${noun}`, tone: "success" as const };
  return { label: `${granted} of ${total} ${noun}`, tone: "warning" as const };
}

export default async function OverviewPage() {
  ensureSeedData();
  const user = await getSession();
  const events = listAuditEvents();
  const activity = auditActivity(24);
  const openKyc = listKycCases().filter(isOpen);
  const highRiskKyc = openKyc.filter((entry) => riskLevel(entry.riskScore) === "high");
  const pendingRefunds = listRefunds().filter(isPending);
  const pendingRefundValue = pendingRefunds.reduce((total, row) => total + row.amountMinor, 0);
  const flags = listFlags();
  const productionFlags = flags.filter(isProduction);
  const productionFlagsOn = productionFlags.filter((flag) => flag.enabled);
  const productionMidRollout = midRollout(flags);

  const metrics: { label: string; value: string | number; hint: string; href?: string }[] = [
    {
      label: "KYC awaiting review",
      value: openKyc.length,
      hint: `${highRiskKyc.length} high risk`,
      href: "/kyc",
    },
    {
      label: "Refunds awaiting decision",
      value: pendingRefunds.length,
      hint: `${formatAmount(pendingRefundValue)} at risk`,
      href: "/refunds",
    },
    {
      label: "Production flags on",
      value: `${productionFlagsOn.length} of ${productionFlags.length}`,
      hint: `${productionMidRollout.length} mid-rollout`,
      href: "/flags?environment=production",
    },
    {
      label: "Blocked attempts (24h)",
      value: activity.denied,
      hint: `${activity.total} actions recorded`,
      href: "/audit?outcome=denied",
    },
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
      key: "availability",
      header: "Availability",
      width: "w-[190px]",
      cell: (app) =>
        app.status === "available" ? (
          <span className="text-ink-muted">Available</span>
        ) : (
          <StatusBadge tone="neutral">Coming in this prototype</StatusBadge>
        ),
    },
    {
      key: "access",
      header: `You can (${ROLE_LABELS[user.role]})`,
      width: "w-[150px]",
      cell: (app) => {
        const access = actionAccess(app, user.role);
        return <StatusBadge tone={access.tone}>{access.label}</StatusBadge>;
      },
    },
    {
      key: "open",
      header: "Open",
      headerSrOnly: true,
      align: "right",
      width: "w-[110px]",
      cell: (app) => (
        <Link
          href={app.href}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline"
        >
          {app.status === "available" ? "Open" : "View scope"}
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      ),
    },
  ];

  const permissionGroups: { app: string; permissions: readonly Permission[] }[] =
    BUSINESS_APPS.map((app) => ({ app: app.name, permissions: app.writePermissions }));

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Northlane operations console. Signed in as ${user.name}, ${ROLE_LABELS[user.role]}.`}
      />

      <div className="space-y-4 p-6">
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-[4px] border border-line bg-line">
          {metrics.map((metric) => {
            const body = (
              <>
                <p className="text-[11.5px] uppercase tracking-[0.05em] text-ink-muted">
                  {metric.label}
                </p>
                <p className="mt-1 text-[22px] font-semibold leading-7 text-ink tabular">
                  {metric.value}
                </p>
                <p className="text-[11.5px] text-ink-muted">{metric.hint}</p>
              </>
            );
            return metric.href ? (
              <Link
                key={metric.label}
                href={metric.href}
                className="bg-surface px-4 py-3 hover:bg-accent-soft"
              >
                {body}
              </Link>
            ) : (
              <div key={metric.label} className="bg-surface px-4 py-3">
                {body}
              </div>
            );
          })}
        </div>

        <Panel title="Internal tools" description="Applications available to operations teams.">
          <DataTable
            ariaLabel="Internal tools"
            columns={columns}
            rows={[...BUSINESS_APPS]}
            getRowId={(app) => app.id}
          />
        </Panel>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-4">
          <Panel
            title={`What you can do · ${ROLE_LABELS[user.role]}`}
            description="Everyone can view every tool; roles differ on actions. Checked server-side before any change."
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
                            <Minus aria-hidden className="size-3.5 text-ink-muted" />
                          )}
                          <span className={allowed ? "text-ink" : "text-ink-muted"}>
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
            title="Recent activity"
            description="Every privileged action, including attempts that were blocked."
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
                  <span className="w-[68px] shrink-0 text-[12px] text-ink-muted tabular">
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
