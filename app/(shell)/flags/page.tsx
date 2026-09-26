import { Flag } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { listFlags } from "@/lib/data/flag-store";
import {
  FLAG_ENVIRONMENT_LABELS,
  isPartialRollout,
  isProduction,
  type FeatureFlag,
  type FlagEnvironment,
} from "@/lib/data/flag-types";
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
import { FlagDrawer } from "./flag-drawer";
import { EnvironmentTag, ExposureText, FlagStateTag } from "./indicators";

const columns: Column<FeatureFlag>[] = [
  {
    key: "flag",
    header: "Flag",
    width: "w-[34%]",
    cell: (row) => (
      <span>
        <span className="block font-medium text-ink">{row.name}</span>
        <span className="block font-mono text-[12px] text-ink-muted">{row.key}</span>
      </span>
    ),
  },
  {
    key: "environment",
    header: "Environment",
    width: "w-[130px]",
    cell: (row) => <EnvironmentTag environment={row.environment} />,
  },
  {
    key: "state",
    header: "State",
    width: "w-[90px]",
    cell: (row) => <FlagStateTag flag={row} />,
  },
  {
    key: "exposure",
    header: "Exposure",
    width: "w-[130px]",
    cell: (row) => <ExposureText flag={row} />,
  },
  {
    key: "owner",
    header: "Owner",
    cell: (row) => <span className="text-ink-muted">{row.owner}</span>,
  },
  {
    key: "updated",
    header: "Last changed",
    width: "w-[110px]",
    numeric: true,
    cell: (row) => (
      <span className="text-ink-muted" title={formatTimestamp(row.updatedAt)}>
        {formatRelative(row.updatedAt)}
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

export default async function FlagsPage({ searchParams }: PageProps<"/flags">) {
  ensureSeedData();
  const params = await searchParams;
  const read = (key: string) => (typeof params[key] === "string" ? params[key] : "");
  const query = read("q").toLowerCase();
  const environment = read("environment");
  const state = read("state");
  const selectedKey = read("flag");
  const done = read("done");

  const user = await getSession();
  const all = listFlags();
  const rows = all.filter((row) => {
    if (environment && row.environment !== environment) return false;
    if (state && (state === "on") !== row.enabled) return false;
    if (
      query &&
      ![row.key, row.name, row.description, row.owner]
        .join(" ")
        .toLowerCase()
        .includes(query)
    ) {
      return false;
    }
    return true;
  });

  const selected = selectedKey ? all.find((row) => row.key === selectedKey) : undefined;
  const filterQuery = queryString({ q: read("q"), environment, state });
  const production = all.filter(isProduction);
  const productionOn = production.filter((row) => row.enabled);
  const partial = all.filter(isPartialRollout);

  return (
    <>
      <PageHeader
        title="Feature Flags"
        description="Runtime configuration for product and risk systems. Production flags first."
        meta={
          <>
            <StatusBadge tone="warning">
              {productionOn.length} of {production.length} production flags on
            </StatusBadge>
            <StatusBadge tone="neutral">{partial.length} mid-rollout</StatusBadge>
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
              search={{ key: "q", placeholder: "Search flag, description or owner" }}
              filters={[
                {
                  key: "environment",
                  label: "Environment",
                  options: (Object.keys(FLAG_ENVIRONMENT_LABELS) as FlagEnvironment[]).map(
                    (value) => ({ value, label: FLAG_ENVIRONMENT_LABELS[value] }),
                  ),
                },
                {
                  key: "state",
                  label: "State",
                  options: [
                    { value: "on", label: "On" },
                    { value: "off", label: "Off" },
                  ],
                },
              ]}
              resultSummary={`${rows.length} of ${all.length} flags`}
            />
          </Suspense>
          <DataTable
            ariaLabel="Feature flags"
            columns={columns}
            rows={rows}
            getRowId={(row) => row.key}
            selectedRowId={selected?.key}
            rowHref={(row) =>
              `/flags${queryString({ q: read("q"), environment, state, flag: row.key })}`
            }
            empty={
              <EmptyState
                icon={Flag}
                title="No feature flags match these filters"
                description="Widen the filters above to see more configuration."
                action={
                  <Link
                    href="/flags"
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
        <FlagDrawer
          flag={selected}
          role={user.role}
          closeHref={`/flags${filterQuery}`}
          done={done || undefined}
        />
      ) : null}
    </>
  );
}
