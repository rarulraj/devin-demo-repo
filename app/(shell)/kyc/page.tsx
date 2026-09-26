import { FileSearch } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { listKycCases } from "@/lib/data/kyc-store";
import {
  RISK_LABELS,
  STATUS_LABELS,
  isOpen,
  riskLevel,
  type KycCase,
  type KycStatus,
  type RiskLevel,
} from "@/lib/data/kyc-types";
import type { KycDecision } from "@/lib/kyc/decisions";
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
import { CaseDrawer } from "./case-drawer";
import { ChecksCell, RiskTag, StatusTag } from "./indicators";

const columns: Column<KycCase>[] = [
  {
    key: "case",
    header: "Case",
    width: "w-[24%]",
    cell: (row) => (
      <span>
        <span className="block font-medium text-ink">{row.customer}</span>
        <span className="block text-[12px] text-ink-muted">
          <span className="font-mono">{row.id}</span> · {row.email}
        </span>
      </span>
    ),
  },
  { key: "country", header: "Country", width: "w-[130px]", cell: (row) => row.country },
  {
    key: "submitted",
    header: "Submitted",
    width: "w-[100px]",
    numeric: true,
    cell: (row) => (
      <span className="text-ink-muted" title={formatTimestamp(row.submittedAt)}>
        {formatRelative(row.submittedAt)}
      </span>
    ),
  },
  {
    key: "risk",
    header: "Risk",
    width: "w-[130px]",
    cell: (row) => <RiskTag score={row.riskScore} />,
  },
  {
    key: "checks",
    header: "Verification",
    width: "w-[190px]",
    cell: (row) => <ChecksCell kycCase={row} />,
  },
  {
    key: "status",
    header: "Status",
    width: "w-[110px]",
    cell: (row) => <StatusTag status={row.status} />,
  },
  {
    key: "assignee",
    header: "Reviewer",
    width: "w-[140px]",
    cell: (row) => <span className="text-ink-muted">{row.assignee}</span>,
  },
];

function queryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return search.size ? `?${search}` : "";
}

export default async function KycPage({ searchParams }: PageProps<"/kyc">) {
  ensureSeedData();
  const params = await searchParams;
  const read = (key: string) => (typeof params[key] === "string" ? params[key] : "");
  const query = read("q").toLowerCase();
  const status = read("status");
  const risk = read("risk");
  const selectedId = read("case");
  const done = read("done");

  const user = await getSession();
  const all = listKycCases();
  const rows = all.filter((row) => {
    if (status && row.status !== status) return false;
    if (risk && riskLevel(row.riskScore) !== risk) return false;
    if (query && ![row.customer, row.email, row.id].join(" ").toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });

  const selected = selectedId ? all.find((row) => row.id === selectedId) : undefined;
  const filterQuery = queryString({ q: read("q"), status, risk });
  const openCases = all.filter(isOpen);
  const highRisk = openCases.filter((row) => riskLevel(row.riskScore) === "high");

  return (
    <>
      <PageHeader
        title="KYC Reviews"
        description="Identity verification queue for onboarding customers. Highest-risk open cases first."
        meta={
          <>
            <StatusBadge tone="info">{openCases.length} awaiting a decision</StatusBadge>
            <StatusBadge tone={highRisk.length > 0 ? "danger" : "neutral"}>
              {highRisk.length} high risk
            </StatusBadge>
            <span className="text-[12.5px] text-ink-muted">
              You are {user.name}, {ROLE_LABELS[user.role]}
            </span>
          </>
        }
      />

      <div className={selected ? "p-6 pr-[564px]" : "p-6"}>
        <Panel>
          <Suspense fallback={<div className="h-[53px] border-b border-line" />}>
            <FilterBar
              search={{ key: "q", placeholder: "Search customer, email or case ID" }}
              filters={[
                {
                  key: "status",
                  label: "Status",
                  options: (Object.keys(STATUS_LABELS) as KycStatus[]).map((value) => ({
                    value,
                    label: STATUS_LABELS[value],
                  })),
                },
                {
                  key: "risk",
                  label: "Risk",
                  options: (Object.keys(RISK_LABELS) as RiskLevel[]).map((value) => ({
                    value,
                    label: RISK_LABELS[value],
                  })),
                },
              ]}
              resultSummary={`${rows.length} of ${all.length} cases`}
            />
          </Suspense>
          <DataTable
            ariaLabel="KYC cases"
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            selectedRowId={selected?.id}
            rowHref={(row) => `/kyc${queryString({ q: read("q"), status, risk, case: row.id })}`}
            empty={
              <EmptyState
                icon={FileSearch}
                title="No cases match these filters"
                description="Widen the filters above to see more of the queue."
                action={
                  <Link href="/kyc" className="text-[12.5px] font-medium text-accent hover:underline">
                    Clear filters
                  </Link>
                }
              />
            }
          />
        </Panel>
      </div>

      {selected ? (
        <CaseDrawer
          kycCase={selected}
          role={user.role}
          closeHref={`/kyc${filterQuery}`}
          done={done ? (done as KycDecision) : undefined}
        />
      ) : null}
    </>
  );
}
