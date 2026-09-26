import { CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import {
  FLAG_ENVIRONMENT_LABELS,
  exposure,
  isProduction,
  type FeatureFlag,
} from "@/lib/data/flag-types";
import { formatRelative, formatTimestamp } from "@/lib/utils";
import { ROLE_LABELS, can, type Role } from "@/platform/rbac";
import { DrawerFocus } from "@/platform/ui/drawer-focus";
import { FlagControls } from "./flag-controls";
import { EnvironmentTag, FlagStateTag } from "./indicators";

const DONE_MESSAGES: Record<string, string> = {
  toggle: "Flag state changed",
  rollout: "Rollout changed",
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

export function FlagDrawer({
  flag,
  role,
  closeHref,
  done,
}: {
  flag: FeatureFlag;
  role: Role;
  closeHref: string;
  done?: string;
}) {
  const canUpdate = can(role, "flag.update");

  return (
    <aside
      aria-label={`Feature flag ${flag.key}`}
      className="fixed right-0 top-12 z-30 flex h-[calc(100%-3rem)] w-[480px] flex-col border-l border-line bg-surface shadow-[-8px_0_24px_-16px_rgba(15,23,42,0.35)]"
    >
      <DrawerFocus returnTo={`flag=${flag.key}`} />
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <EnvironmentTag environment={flag.environment} />
            <FlagStateTag flag={flag} />
          </div>
          <h2
            tabIndex={-1}
            className="mt-0.5 truncate text-[15px] font-semibold tracking-[-0.01em] text-ink outline-none"
          >
            {flag.name}
          </h2>
          <p className="truncate font-mono text-[12px] text-ink-muted">{flag.key}</p>
        </div>
        <Link
          href={closeHref}
          aria-label="Close feature flag"
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
              {DONE_MESSAGES[done] ?? "Flag changed"}. The change and your reason are in the{" "}
              <Link
                href={`/audit?q=${flag.key}`}
                className="font-medium underline underline-offset-2"
              >
                audit log
              </Link>
              .
            </span>
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
          <Field label="Environment">{FLAG_ENVIRONMENT_LABELS[flag.environment]}</Field>
          <Field label="State">{flag.enabled ? "Enabled" : "Disabled"}</Field>
          <Field label="Current exposure">{exposure(flag)}</Field>
          <Field label="Stored rollout">{flag.rollout}%</Field>
          <Field label="Owner">{flag.owner}</Field>
          <Field label="Last changed">
            <span title={formatTimestamp(flag.updatedAt)}>{formatRelative(flag.updatedAt)}</span>
          </Field>
        </div>

        <Section title="What this controls">
          <p className="text-[12.5px] text-ink">{flag.description}</p>
          {isProduction(flag) ? (
            <p className="mt-2 text-[12.5px] text-ink-muted">
              Changes here update the simulated production configuration. No live
              customer traffic is evaluated against these flags.
            </p>
          ) : null}
        </Section>

        <Section title="Change history">
          {flag.history.length > 0 ? (
            <ul className="space-y-2">
              {flag.history.map((entry) => (
                <li key={`${entry.at}-${entry.change}`} className="text-[12.5px]">
                  <span className="text-ink-muted">
                    <span className="font-medium text-ink">{entry.author}</span> ·{" "}
                    <span title={formatTimestamp(entry.at)}>{formatRelative(entry.at)}</span> ·{" "}
                    {entry.change}
                  </span>
                  <p className="text-ink">{entry.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-ink-muted">No recorded changes in this prototype.</p>
          )}
        </Section>
      </div>

      <footer className="border-t border-line bg-canvas px-4 py-3">
        <FlagControls
          flagKey={flag.key}
          label={flag.name}
          enabled={flag.enabled}
          rollout={flag.rollout}
          production={isProduction(flag)}
          roleLabel={ROLE_LABELS[role]}
          canUpdate={canUpdate}
        />
      </footer>
    </aside>
  );
}
