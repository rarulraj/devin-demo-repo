import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import {
  CHECK_STATE_LABELS,
  STATUS_LABELS,
  isOpen,
  type KycCase,
} from "@/lib/data/kyc-types";
import type { KycDecision } from "@/lib/kyc/decisions";
import { formatTimestamp, formatRelative } from "@/lib/utils";
import { ROLE_LABELS, can, type Role } from "@/platform/rbac";
import { Button } from "@/platform/ui/button";
import { DecisionActions } from "./decision-actions";
import { RiskTag, CheckIcon, StatusTag } from "./indicators";

const DECISION_BUTTONS = [
  {
    decision: "approve" as const,
    label: "Approve",
    title: "Approve this case",
    description: "The customer is onboarded and the decision is recorded against",
    tone: "primary" as const,
    variant: "primary" as const,
    permission: "kyc.approve" as const,
  },
  {
    decision: "escalate" as const,
    label: "Escalate",
    title: "Escalate for enhanced due diligence",
    description: "A senior reviewer picks up",
    tone: "primary" as const,
    variant: "secondary" as const,
    permission: "kyc.escalate" as const,
  },
  {
    decision: "reject" as const,
    label: "Reject",
    title: "Reject this case",
    description: "Onboarding is refused for",
    tone: "danger" as const,
    variant: "danger" as const,
    permission: "kyc.reject" as const,
  },
];

const DONE_MESSAGES: Record<KycDecision, string> = {
  approve: "Case approved",
  reject: "Case rejected",
  escalate: "Case escalated for enhanced due diligence",
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

export function CaseDrawer({
  kycCase,
  role,
  closeHref,
  done,
}: {
  kycCase: KycCase;
  role: Role;
  closeHref: string;
  done?: KycDecision;
}) {
  const open = isOpen(kycCase);
  const buttons = DECISION_BUTTONS.map((button) => ({
    ...button,
    allowed: can(role, button.permission),
  }));
  const canDecide = buttons.some((button) => button.allowed);

  return (
    <aside
      aria-label={`Case ${kycCase.id}`}
      className="fixed right-0 top-12 z-30 flex h-[calc(100%-3rem)] w-[540px] flex-col border-l border-line bg-surface shadow-[-8px_0_24px_-16px_rgba(15,23,42,0.35)]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-ink-muted">{kycCase.id}</span>
            <StatusTag status={kycCase.status} />
          </div>
          <h2 className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {kycCase.customer}
          </h2>
        </div>
        <Link
          href={closeHref}
          aria-label="Close case"
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
              {DONE_MESSAGES[done]}. The decision and your note are in the{" "}
              <Link
                href={`/audit?q=${kycCase.id}`}
                className="font-medium underline underline-offset-2"
              >
                audit log
              </Link>
              .
            </span>
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
          <Field label="Email">
            <span className="break-all">{kycCase.email}</span>
          </Field>
          <Field label="Country">{kycCase.country}</Field>
          <Field label="Submitted">
            <span title={formatTimestamp(kycCase.submittedAt)}>
              {formatRelative(kycCase.submittedAt)}
            </span>
          </Field>
          <Field label="Assigned reviewer">{kycCase.assignee}</Field>
          <Field label="Risk">
            <RiskTag score={kycCase.riskScore} />
          </Field>
          <Field label="Status">{STATUS_LABELS[kycCase.status]}</Field>
        </div>

        <Section title="Why this case is risky">
          {kycCase.riskFactors.length > 0 ? (
            <ul className="space-y-1">
              {kycCase.riskFactors.map((factor) => (
                <li key={factor} className="flex gap-2 text-[12.5px] text-ink">
                  <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-danger" />
                  {factor}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-ink-muted">
              No risk factors recorded. All verification checks passed.
            </p>
          )}
        </Section>

        <Section title="Verification checks">
          <ul className="divide-y divide-line">
            {kycCase.checks.map((check) => (
              <li key={check.key} className="flex gap-2 py-2 first:pt-0 last:pb-0">
                <span className="mt-0.5">
                  <CheckIcon state={check.state} />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[12.5px] font-medium text-ink">{check.label}</span>
                    <span
                      className={
                        check.state === "failed"
                          ? "text-[12px] font-medium text-danger"
                          : check.state === "needs_review"
                            ? "text-[12px] font-medium text-warning"
                            : "text-[12px] text-ink-muted"
                      }
                    >
                      {CHECK_STATE_LABELS[check.state]}
                    </span>
                  </span>
                  <span className="block text-[12.5px] text-ink-muted">{check.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Reviewer notes">
          {kycCase.notes.length > 0 ? (
            <ul className="space-y-2">
              {kycCase.notes.map((note) => (
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
            <p className="text-[12.5px] text-ink-muted">No notes yet.</p>
          )}
        </Section>
      </div>

      <footer className="border-t border-line bg-canvas px-4 py-3">
        {open ? (
          <DecisionActions
            caseId={kycCase.id}
            customer={kycCase.customer}
            buttons={buttons}
            roleLabel={ROLE_LABELS[role]}
            canDecide={canDecide}
          />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] text-ink-muted">
              Decided by {kycCase.assignee}. Closed cases cannot be changed.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/audit?q=${kycCase.id}`}>View audit trail</Link>
            </Button>
          </div>
        )}
      </footer>
    </aside>
  );
}
