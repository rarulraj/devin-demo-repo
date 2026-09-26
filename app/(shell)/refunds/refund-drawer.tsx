import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import {
  REFUND_CATEGORY_LABELS,
  REFUND_STATUS_LABELS,
  formatAmount,
  isPending,
  type RefundRequest,
} from "@/lib/data/refund-types";
import type { RefundDecision } from "@/lib/refunds/decisions";
import { formatRelative, formatTimestamp } from "@/lib/utils";
import { ROLE_LABELS, can, type Role } from "@/platform/rbac";
import { Button } from "@/platform/ui/button";
import { DrawerFocus } from "@/platform/ui/drawer-focus";
import { RefundDecisionActions } from "./decision-actions";
import { RefundStatusTag } from "./indicators";

const DECISION_BUTTONS = [
  {
    decision: "approve" as const,
    label: "Approve",
    title: "Approve this refund",
    description: "Records a refund authorization for",
    deniedDescription: "An approval would record a refund authorization for",
    tone: "primary" as const,
    variant: "primary" as const,
    permission: "refund.approve" as const,
  },
  {
    decision: "reject" as const,
    label: "Reject",
    title: "Reject this refund",
    description: "The customer keeps the charge and is told the claim was refused for",
    deniedDescription: "A rejection would refuse the claim on",
    tone: "danger" as const,
    variant: "danger" as const,
    permission: "refund.reject" as const,
  },
];

const DONE_MESSAGES: Record<RefundDecision, string> = {
  approve: "Refund authorization recorded",
  reject: "Refund rejected",
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

export function RefundDrawer({
  refund,
  role,
  closeHref,
  done,
}: {
  refund: RefundRequest;
  role: Role;
  closeHref: string;
  done?: RefundDecision;
}) {
  const pending = isPending(refund);
  const buttons = DECISION_BUTTONS.map((button) => ({
    ...button,
    allowed: can(role, button.permission),
  }));
  const canDecide = buttons.some((button) => button.allowed);
  const summary = `${refund.id} · ${formatAmount(refund.amountMinor)} · ${refund.customer}`;

  return (
    <aside
      aria-label={`Refund ${refund.id}`}
      className="fixed right-0 top-12 z-30 flex h-[calc(100%-3rem)] w-[480px] flex-col border-l border-line bg-surface shadow-[-8px_0_24px_-16px_rgba(15,23,42,0.35)]"
    >
      <DrawerFocus returnTo={`refund=${refund.id}`} />
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-ink-muted">{refund.id}</span>
            <RefundStatusTag status={refund.status} />
          </div>
          <h2
            tabIndex={-1}
            className="mt-0.5 flex items-baseline gap-2 truncate text-[15px] font-semibold tracking-[-0.01em] text-ink outline-none"
          >
            <span className="tabular">{formatAmount(refund.amountMinor)}</span>
            <span className="truncate text-[13px] font-normal text-ink-muted">
              {refund.customer}
            </span>
          </h2>
        </div>
        <Link
          href={closeHref}
          aria-label="Close refund"
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
              {DONE_MESSAGES[done]}. The decision and your reason are in the{" "}
              <Link
                href={`/audit?q=${refund.id}`}
                className="font-medium underline underline-offset-2"
              >
                audit log
              </Link>
              .
            </span>
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
          <Field label="Transaction">
            <span className="font-mono text-[12.5px]">{refund.transactionId}</span>
          </Field>
          <Field label="Payment method">{refund.paymentMethod}</Field>
          <Field label="Charged">
            <span title={formatTimestamp(refund.chargedAt)}>
              {formatRelative(refund.chargedAt)}
            </span>
          </Field>
          <Field label="Requested">
            <span title={formatTimestamp(refund.submittedAt)}>
              {formatRelative(refund.submittedAt)}
            </span>
          </Field>
          <Field label="Category">{REFUND_CATEGORY_LABELS[refund.category]}</Field>
          <Field label="Status">{REFUND_STATUS_LABELS[refund.status]}</Field>
          <Field label="Customer">
            <span className="break-all">{refund.email}</span>
          </Field>
          <Field label="Raised by">{refund.requestedBy}</Field>
        </div>

        <Section title="Customer claim">
          <p className="text-[12.5px] text-ink">{refund.customerReason}</p>
        </Section>

        <Section title="What we know about this charge">
          <ul className="space-y-1">
            {refund.context.map((item) => (
              <li key={item} className="flex gap-2 text-[12.5px] text-ink">
                <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-subtle" />
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Decision history">
          {refund.notes.length > 0 ? (
            <ul className="space-y-2">
              {refund.notes.map((note) => (
                <li key={`${note.at}-${note.author}`} className="text-[12.5px]">
                  <span className="text-ink-muted">
                    <span className="font-medium text-ink">{note.author}</span> ·{" "}
                    <span title={formatTimestamp(note.at)}>{formatRelative(note.at)}</span>
                  </span>
                  <p className="text-ink">{note.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-ink-muted">No decision recorded yet.</p>
          )}
        </Section>
      </div>

      <footer className="border-t border-line bg-canvas px-4 py-3">
        {pending ? (
          <RefundDecisionActions
            refundId={refund.id}
            summary={summary}
            buttons={buttons}
            roleLabel={ROLE_LABELS[role]}
            canDecide={canDecide}
          />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] text-ink-muted">
              Already {REFUND_STATUS_LABELS[refund.status].toLowerCase()}. Decided requests cannot
              be changed.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/audit?q=${refund.id}`}>View audit trail</Link>
            </Button>
          </div>
        )}
      </footer>
    </aside>
  );
}
