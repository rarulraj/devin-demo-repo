import { ScrollText } from "lucide-react";
import { Suspense } from "react";
import { ensureSeedData } from "@/lib/data/seed";
import { formatTimestamp } from "@/lib/utils";
import { listAuditEvents, type AuditEvent } from "@/platform/audit";
import { ROLE_LABELS } from "@/platform/rbac";
import { APP_REGISTRY, getApp } from "@/platform/registry";
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
    width: "w-[172px]",
    numeric: true,
    cell: (event) => <span className="text-ink-muted">{formatTimestamp(event.at)}</span>,
  },
  {
    key: "actor",
    header: "Actor",
    width: "w-[190px]",
    cell: (event) => (
      <span>
        <span className="block font-medium text-ink">{event.actor}</span>
        <span className="block text-[12px] text-ink-muted">{ROLE_LABELS[event.role]}</span>
      </span>
    ),
  },
  {
    key: "app",
    header: "Application",
    width: "w-[130px]",
    cell: (event) => getApp(event.app).name,
  },
  { key: "action", header: "Action", cell: (event) => event.action },
  {
    key: "entity",
    header: "Entity",
    cell: (event) => (
      <span className="font-mono text-[12px] text-ink-muted">{event.entityLabel}</span>
    ),
  },
  {
    key: "change",
    header: "Change",
    width: "w-[150px]",
    cell: (event) =>
      event.before && event.after ? (
        <span className="text-[12px] text-ink-muted">
          {event.before} <span aria-hidden>→</span>{" "}
          <span className="text-ink">{event.after}</span>
        </span>
      ) : (
        <span className="text-ink-subtle">—</span>
      ),
  },
  {
    key: "outcome",
    header: "Outcome",
    width: "w-[100px]",
    cell: (event) =>
      event.outcome === "success" ? (
        <StatusBadge tone="success">Success</StatusBadge>
      ) : (
        <StatusBadge tone="danger">Denied</StatusBadge>
      ),
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
        description="Append-only record written by the shared mutation path. Applications cannot change state without producing an entry here."
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
                  options: APP_REGISTRY.filter((entry) => entry.id !== "overview").map((entry) => ({
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
