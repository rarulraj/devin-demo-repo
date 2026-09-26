import { Gauge } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { listAccounts, listRequests, pendingRequestFor } from "@/lib/data/limit-store";
import {
  SEGMENT_LABELS,
  formatLimit,
  limitDelta,
  type Account,
  type AccountSegment,
} from "@/lib/data/limit-types";
import { ensureSeedData } from "@/lib/data/seed";
import { formatRelative, formatTimestamp } from "@/lib/utils";
import { ROLE_LABELS } from "@/platform/rbac";
import { getSession } from "@/platform/session";
import { DataTable, type Column } from "@/platform/ui/data-table";
import { EmptyState } from "@/platform/ui/empty-state";
import { FilterBar } from "@/platform/ui/filter-bar";
import { PageHeader } from "@/platform/ui/page-header";
import { Panel } from "@/platform/ui/panel";
import { StatusBadge } from "@/platform/ui/status-badge";
import { AccountDrawer } from "./account-drawer";

const REQUEST_FILTERS = [
  { value: "pending", label: "Awaiting a decision" },
  { value: "none", label: "No open request" },
];

const columns: Column<Account>[] = [
  {
    key: "account",
    header: "Account",
    width: "w-[28%]",
    cell: (row) => (
      <span>
        <span className="block font-medium text-ink">{row.customer}</span>
        <span className="block text-[12px] text-ink-muted">
          <span className="font-mono">{row.id}</span> · {row.country}
        </span>
      </span>
    ),
  },
  {
    key: "segment",
    header: "Segment",
    width: "w-[120px]",
    cell: (row) => <span className="text-ink-muted">{SEGMENT_LABELS[row.segment]}</span>,
  },
  {
    key: "limit",
    header: "Daily limit",
    width: "w-[120px]",
    align: "right",
    numeric: true,
    cell: (row) => (
      <span className="font-semibold text-ink">{formatLimit(row.dailyLimitMinor)}</span>
    ),
  },
  {
    key: "peak",
    header: "30-day peak",
    width: "w-[120px]",
    align: "right",
    numeric: true,
    cell: (row) => (
      <span className="text-ink-muted">{formatLimit(row.peakDailyVolumeMinor)}</span>
    ),
  },
  {
    key: "request",
    header: "Pending request",
    cell: (row) => {
      const pending = pendingRequestFor(row.id);
      if (!pending) return <span className="text-ink-subtle">—</span>;
      return (
        <span className="text-ink">
          {formatLimit(pending.requestedLimitMinor)}{" "}
          <span className="text-ink-muted">({limitDelta(pending)})</span>{" "}
          <span className="font-mono text-[12px] text-ink-muted">{pending.id}</span>
        </span>
      );
    },
  },
  {
    key: "updated",
    header: "Limit set",
    width: "w-[100px]",
    numeric: true,
    cell: (row) => (
      <span className="text-ink-muted" title={formatTimestamp(row.limitSetAt)}>
        {formatRelative(row.limitSetAt)}
      </span>
    ),
  },
];

function queryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return search.size ? `?${search}` : "";
}

export default async function LimitsPage({ searchParams }: PageProps<"/limits">) {
  ensureSeedData();
  const params = await searchParams;
  const read = (key: string) => (typeof params[key] === "string" ? params[key] : "");
  const query = read("q").toLowerCase();
  const segment = read("segment");
  const request = read("request");
  const selectedId = read("account");
  const done = read("done");

  const user = await getSession();
  const all = listAccounts();
  const rows = all.filter((row) => {
    if (segment && row.segment !== segment) return false;
    if (request) {
      const pending = pendingRequestFor(row.id) !== undefined;
      if (request === "pending" && !pending) return false;
      if (request === "none" && pending) return false;
    }
    if (query && ![row.customer, row.email, row.id].join(" ").toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });

  const selected = selectedId ? all.find((row) => row.id === selectedId) : undefined;
  const filterQuery = queryString({ q: read("q"), segment, request });
  const pendingCount = all.filter((row) => pendingRequestFor(row.id) !== undefined).length;

  return (
    <>
      <PageHeader
        title="Transaction Limits"
        description="Daily transaction limits by account. Accounts with an open request are listed first."
        meta={
          <>
            <StatusBadge tone="info">{pendingCount} awaiting a decision</StatusBadge>
            <StatusBadge tone="neutral">{all.length} accounts</StatusBadge>
            <span className="text-[12.5px] text-ink-muted">
              You are {user.name}, {ROLE_LABELS[user.role]}
            </span>
          </>
        }
      />

      <div className={selected ? "p-6 pr-[504px]" : "p-6"}>
        <Panel>
          <Suspense fallback={<div className="h-[53px] border-b border-line" />}>
            <FilterBar
              search={{ key: "q", placeholder: "Search customer, email or account ID" }}
              filters={[
                {
                  key: "request",
                  label: "Request",
                  options: REQUEST_FILTERS,
                },
                {
                  key: "segment",
                  label: "Segment",
                  options: (Object.keys(SEGMENT_LABELS) as AccountSegment[]).map((value) => ({
                    value,
                    label: SEGMENT_LABELS[value],
                  })),
                },
              ]}
              resultSummary={`${rows.length} of ${all.length} accounts`}
            />
          </Suspense>
          <DataTable
            ariaLabel="Customer accounts"
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            selectedRowId={selected?.id}
            rowHref={(row) =>
              `/limits${queryString({ q: read("q"), segment, request, account: row.id })}`
            }
            empty={
              <EmptyState
                icon={Gauge}
                title="No accounts match these filters"
                description="Widen the filters above to see more accounts."
                action={
                  <Link
                    href="/limits"
                    className="text-[12.5px] font-medium text-accent hover:underline"
                  >
                    Clear filters
                  </Link>
                }
              />
            }
          />
        </Panel>
      </div>

      {selected ? (
        <AccountDrawer
          account={selected}
          requests={listRequests(selected.id)}
          role={user.role}
          closeHref={`/limits${filterQuery}`}
          done={done || undefined}
        />
      ) : null}
    </>
  );
}
