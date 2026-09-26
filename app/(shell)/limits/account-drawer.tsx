import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import {
  SEGMENT_LABELS,
  formatLimit,
  limitDelta,
  type Account,
  type LimitRequest,
} from "@/lib/data/limit-types";
import { formatRelative, formatTimestamp } from "@/lib/utils";
import { ROLE_LABELS, can, type Role } from "@/platform/rbac";
import { DrawerFocus } from "@/platform/ui/drawer-focus";
import { LimitControls } from "./limit-controls";
import { LimitRequestTag } from "./indicators";

const DONE_MESSAGES: Record<string, string> = {
  request: "Limit-change request recorded",
  approve: "Limit change approved",
  reject: "Limit change rejected",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.05em] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-ink">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-4 py-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function AccountDrawer({
  account,
  requests,
  role,
  closeHref,
  done,
  doneRef,
}: {
  account: Account;
  requests: LimitRequest[];
  role: Role;
  closeHref: string;
  done?: string;
  /** Entity the audit entry for `done` is filed under. */
  doneRef?: string;
}) {
  const pending = requests.find((entry) => entry.status === "pending");
  const history = requests.filter((entry) => entry.status !== "pending");

  return (
    <aside
      aria-label={`Account ${account.id}`}
      className="fixed right-0 top-12 z-30 flex h-[calc(100%-3rem)] w-[480px] flex-col border-l border-line bg-surface shadow-[-8px_0_24px_-16px_rgba(15,23,42,0.35)]"
    >
      <DrawerFocus returnTo={`account=${account.id}`} />
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2
            tabIndex={-1}
            className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink outline-none"
          >
            {account.customer}
          </h2>
          <p className="truncate text-[12px] text-ink-muted">
            <span className="font-mono">{account.id}</span> · {account.email}
          </p>
        </div>
        <Link
          href={closeHref}
          aria-label="Close account"
          className="rounded-[3px] p-1 text-ink-muted hover:bg-canvas hover:text-ink"
          scroll={false}
        >
          <X aria-hidden className="size-4" />
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {done ? (
          <p className="flex items-start gap-2 border-b border-[#bcdcca] bg-success-soft px-4 py-2.5 text-[12.5px] text-success">
            <CheckCircle2 aria-hidden className="mt-px size-4 shrink-0" />
            <span>
              {DONE_MESSAGES[done] ?? "Change recorded"}. The action and your reason are in the{" "}
              <Link
                href={`/audit?q=${doneRef ?? account.id}`}
                className="font-medium underline underline-offset-2"
              >
                audit log
              </Link>
              .
            </span>
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
          <Field label="Current daily limit">
            <span className="font-semibold">{formatLimit(account.dailyLimitMinor)}</span>
          </Field>
          <Field label="30-day peak day">{formatLimit(account.peakDailyVolumeMinor)}</Field>
          <Field label="Segment">{SEGMENT_LABELS[account.segment]}</Field>
          <Field label="Country">{account.country}</Field>
          <Field label="Limit set by">{account.limitSetBy}</Field>
          <Field label="Limit set">
            <span title={formatTimestamp(account.limitSetAt)}>
              {formatRelative(account.limitSetAt)}
            </span>
          </Field>
        </div>

        <Section title="Pending request">
          {pending ? (
            <div className="space-y-1.5 text-[12.5px]">
              <div className="flex items-center gap-2">
                <LimitRequestTag status={pending.status} />
                <span className="font-mono text-ink-muted">{pending.id}</span>
              </div>
              <p className="text-ink">
                {formatLimit(pending.previousLimitMinor)} →{" "}
                <span className="font-semibold">{formatLimit(pending.requestedLimitMinor)}</span>{" "}
                <span className="text-ink-muted">({limitDelta(pending)})</span>
              </p>
              <p className="text-ink-muted">
                Requested by <span className="font-medium text-ink">{pending.requestedBy}</span> ·{" "}
                <span title={formatTimestamp(pending.requestedAt)}>
                  {formatRelative(pending.requestedAt)}
                </span>
              </p>
              <p className="text-ink">{pending.justification}</p>
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-muted">
              No open request. The limit stays as recorded until a request is approved.
            </p>
          )}
        </Section>

        <Section title="Decided requests">
          {history.length > 0 ? (
            <ul className="space-y-2">
              {history.map((entry) => (
                <li key={entry.id} className="text-[12.5px]">
                  <span className="text-ink-muted">
                    <span className="font-mono">{entry.id}</span> ·{" "}
                    {formatLimit(entry.previousLimitMinor)} →{" "}
                    {formatLimit(entry.requestedLimitMinor)} ·{" "}
                    {entry.status === "approved" ? "Approved" : "Rejected"}
                    {entry.decision ? (
                      <>
                        {" "}
                        by <span className="font-medium text-ink">{entry.decision.author}</span> ·{" "}
                        <span title={formatTimestamp(entry.decision.at)}>
                          {formatRelative(entry.decision.at)}
                        </span>
                      </>
                    ) : null}
                  </span>
                  {entry.decision ? <p className="text-ink">{entry.decision.text}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-ink-muted">No decided requests for this account.</p>
          )}
        </Section>
      </div>

      <footer className="border-t border-line bg-canvas px-4 py-3">
        <LimitControls
          key={`${account.id}:${account.dailyLimitMinor}`}
          accountId={account.id}
          accountLabel={account.customer}
          currentLimitMinor={account.dailyLimitMinor}
          pending={
            pending
              ? { id: pending.id, requestedLimitMinor: pending.requestedLimitMinor }
              : undefined
          }
          roleLabel={ROLE_LABELS[role]}
          canRequest={can(role, "limit.request")}
          canApprove={can(role, "limit.approve")}
          canReject={can(role, "limit.reject")}
        />
      </footer>
    </aside>
  );
}
