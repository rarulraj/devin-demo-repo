import { ReceiptText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { listRefunds } from "@/lib/data/refund-store";
import {
  REFUND_CATEGORY_LABELS,
  REFUND_STATUS_LABELS,
  formatAmount,
  isPending,
  type RefundCategory,
  type RefundRequest,
  type RefundStatus,
} from "@/lib/data/refund-types";
import { ensureSeedData } from "@/lib/data/seed";
import type { RefundDecision } from "@/lib/refunds/decisions";
import { formatRelative, formatTimestamp } from "@/lib/utils";
import { ROLE_LABELS } from "@/platform/rbac";
import { getSession } from "@/platform/session";
import { DataTable, type Column } from "@/platform/ui/data-table";
import { EmptyState } from "@/platform/ui/empty-state";
import { FilterBar } from "@/platform/ui/filter-bar";
import { PageHeader } from "@/platform/ui/page-header";
import { Panel } from "@/platform/ui/panel";
import { StatusBadge } from "@/platform/ui/status-badge";
import { RefundStatusTag } from "./indicators";
import { RefundDrawer } from "./refund-drawer";

const columns: Column<RefundRequest>[] = [
  {
    key: "request",
    header: "Request",
    width: "w-[26%]",
    cell: (row) => (
      <span>
        <span className="block font-medium text-ink">{row.customer}</span>
        <span className="block text-[12px] text-ink-muted">
          <span className="font-mono">{row.id}</span> ·{" "}
          <span className="font-mono">{row.transactionId}</span>
        </span>
      </span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    width: "w-[110px]",
    align: "right",
    numeric: true,
    cell: (row) => <span className="font-semibold text-ink">{formatAmount(row.amountMinor)}</span>,
  },
  {
    key: "category",
    header: "Category",
    width: "w-[150px]",
    cell: (row) => <span className="text-ink-muted">{REFUND_CATEGORY_LABELS[row.category]}</span>,
  },
  {
    key: "claim",
    header: "Customer claim",
    cell: (row) => (
      <span className="block max-w-[320px] truncate text-ink-muted" title={row.customerReason}>
        {row.customerReason}
      </span>
    ),
  },
  {
    key: "submitted",
    header: "Requested",
    width: "w-[100px]",
    numeric: true,
    cell: (row) => (
      <span className="text-ink-muted" title={formatTimestamp(row.submittedAt)}>
        {formatRelative(row.submittedAt)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "w-[110px]",
    cell: (row) => <RefundStatusTag status={row.status} />,
  },
];

function queryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return search.size ? `?${search}` : "";
}

export default async function RefundsPage({ searchParams }: PageProps<"/refunds">) {
  ensureSeedData();
  const params = await searchParams;
  const read = (key: string) => (typeof params[key] === "string" ? params[key] : "");
  const query = read("q").toLowerCase();
  const status = read("status");
  const category = read("category");
  const selectedId = read("refund");
  const done = read("done");

  const user = await getSession();
  const all = listRefunds();
  const rows = all.filter((row) => {
    if (status && row.status !== status) return false;
    if (category && row.category !== category) return false;
    if (
      query &&
      ![row.customer, row.email, row.id, row.transactionId].join(" ").toLowerCase().includes(query)
    ) {
      return false;
    }
    return true;
  });

  const selected = selectedId ? all.find((row) => row.id === selectedId) : undefined;
  const filterQuery = queryString({ q: read("q"), status, category });
  const pending = all.filter(isPending);
  const pendingValue = pending.reduce((total, row) => total + row.amountMinor, 0);

  return (
    <>
      <PageHeader
        title="Refunds"
        description="Refund requests awaiting an operations decision. Largest amounts at risk first."
        meta={
          <>
            <StatusBadge tone="info">{pending.length} awaiting a decision</StatusBadge>
            <StatusBadge tone="neutral">{formatAmount(pendingValue)} pending</StatusBadge>
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
              search={{ key: "q", placeholder: "Search customer, email, refund or transaction ID" }}
              filters={[
                {
                  key: "status",
                  label: "Status",
                  options: (Object.keys(REFUND_STATUS_LABELS) as RefundStatus[]).map((value) => ({
                    value,
                    label: REFUND_STATUS_LABELS[value],
                  })),
                },
                {
                  key: "category",
                  label: "Category",
                  options: (Object.keys(REFUND_CATEGORY_LABELS) as RefundCategory[]).map(
                    (value) => ({ value, label: REFUND_CATEGORY_LABELS[value] }),
                  ),
                },
              ]}
              resultSummary={`${rows.length} of ${all.length} requests`}
            />
          </Suspense>
          <DataTable
            ariaLabel="Refund requests"
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            selectedRowId={selected?.id}
            rowHref={(row) =>
              `/refunds${queryString({ q: read("q"), status, category, refund: row.id })}`
            }
            empty={
              <EmptyState
                icon={ReceiptText}
                title="No refund requests match these filters"
                description="Widen the filters above to see more of the queue."
                action={
                  <Link
                    href="/refunds"
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
        <RefundDrawer
          refund={selected}
          role={user.role}
          closeHref={`/refunds${filterQuery}`}
          done={done ? (done as RefundDecision) : undefined}
        />
      ) : null}
    </>
  );
}
