import { ScrollText } from "lucide-react";
import { Suspense } from "react";
import { ensureSeedData } from "@/lib/data/seed";
import { formatTimestamp, formatTimestampShort, humanizeState } from "@/lib/utils";
import { listAuditEvents, type AuditEvent } from "@/platform/audit";
import { ROLE_LABELS } from "@/platform/rbac";
import { BUSINESS_APPS, appLabel } from "@/platform/registry";
import { DataTable, type Column } from "@/platform/ui/data-table";
import { EmptyState } from "@/platform/ui/empty-state";
import { FilterBar } from "@/platform/ui/filter-bar";
import { PageHeader } from "@/platform/ui/page-header";
import { Panel } from "@/platform/ui/panel";
import { StatusBadge } from "@/platform/ui/status-badge";

const columns: Column<AuditEvent>[] = [
  {
    key: "at",
    header: "Timestamp",
    width: "w-[122px]",
    numeric: true,
    cell: (event) => (
      <span className="whitespace-nowrap text-ink-muted" title={formatTimestamp(event.at)}>
        {formatTimestampShort(event.at)}
      </span>
    ),
  },
  {
    key: "actor",
    header: "Actor",
    width: "w-[145px]",
    cell: (event) => (
      <span>
        <span className="block whitespace-nowrap font-medium text-ink">{event.actor}</span>
        <span className="block text-[12px] text-ink-muted">{ROLE_LABELS[event.role]}</span>
      </span>
    ),
  },
  {
    key: "app",
    header: "Application",
    width: "w-[105px]",
    cell: (event) => appLabel(event.app),
  },
  {
    key: "action",
    header: "Action",
    width: "w-[160px]",
    cell: (event) => (
      <span>
        <span className="block whitespace-nowrap">{event.action}</span>
        {event.before && event.after ? (
          <span className="block whitespace-nowrap text-[12px] text-ink-muted">
            {humanizeState(event.before)} <span aria-hidden>→</span>{" "}
            <span className="text-ink">{humanizeState(event.after)}</span>
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: "entity",
    header: "Entity",
    width: "w-[165px]",
    cell: (event) => {
      const [id, ...rest] = event.entityLabel.split(" · ");
      return (
        <span>
          <span className="font-mono text-[12px] text-ink">{id}</span>
          {rest.length > 0 ? (
            <span className="block truncate text-[12px] text-ink-muted">{rest.join(" · ")}</span>
          ) : null}
        </span>
      );
    },
  },
  {
    key: "reason",
    header: "Reason",
    width: "w-[240px]",
    cell: (event) =>
      event.reason ? (
        <span className="line-clamp-2 text-[12.5px] text-ink-muted" title={event.reason}>
          {event.reason}
        </span>
      ) : (
        <span className="text-ink-subtle">—</span>
      ),
  },
  {
    key: "outcome",
    header: "Outcome",
    width: "w-[100px]",
    cell: (event) => {
      if (event.outcome === "success") return <StatusBadge tone="success">Success</StatusBadge>;
      if (event.outcome === "denied") return <StatusBadge tone="danger">Denied</StatusBadge>;
      return <StatusBadge tone="warning">Failed</StatusBadge>;
    },
  },
];

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  ensureSeedData();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.toLowerCase() : "";
  const app = typeof params.app === "string" ? params.app : "";
  const outcome = typeof params.outcome === "string" ? params.outcome : "";

  const all = listAuditEvents();
  const rows = all.filter((event) => {
    if (app && event.app !== app) return false;
    if (outcome && event.outcome !== outcome) return false;
    if (
      query &&
      ![event.actor, event.action, event.entityLabel, event.reason ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
      return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Who changed what, when, and why — recorded for every privileged action, including attempts that were blocked."
      />
      <div className="p-6">
        <Panel>
          <Suspense fallback={<div className="h-[53px] border-b border-line" />}>
            <FilterBar
              search={{ key: "q", placeholder: "Search actor, entity or reason" }}
              filters={[
                {
                  key: "app",
                  label: "Application",
                  options: BUSINESS_APPS.map((entry) => ({
                    value: entry.id,
                    label: entry.name,
                  })),
                },
                {
                  key: "outcome",
                  label: "Outcome",
                  options: [
                    { value: "success", label: "Success" },
                    { value: "denied", label: "Denied" },
                    { value: "error", label: "Failed" },
                  ],
                },
              ]}
              resultSummary={`${rows.length} of ${all.length} events`}
            />
          </Suspense>
          <DataTable
            ariaLabel="Audit events"
            columns={columns}
            rows={rows}
            getRowId={(event) => event.id}
            empty={
              <EmptyState
                icon={ScrollText}
                title="No matching audit events"
                description="Adjust the filters above to widen the search."
              />
            }
          />
        </Panel>
      </div>
    </>
  );
}
