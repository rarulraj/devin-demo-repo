import { Check, Minus } from "lucide-react";
import { PERMISSION_LABELS, ROLE_LABELS, ROLES, can } from "../rbac";
import type { RegisteredApp } from "../registry";
import type { Role } from "../rbac";
import { PageHeader } from "./page-header";
import { Panel } from "./panel";
import { StatusBadge } from "./status-badge";

/**
 * Placeholder for a registered application that has not been built yet.
 * It still renders the contract the application will be held to: the
 * permissions it will mutate through and who may use them.
 */
export function NotImplementedApp({ app, role }: { app: RegisteredApp; role: Role }) {
  return (
    <>
      <PageHeader
        title={app.name}
        description={app.summary}
        meta={
          <>
            <StatusBadge tone="neutral">Not implemented</StatusBadge>
            <span className="text-[12px] text-ink-muted">Owned by {app.owner}</span>
          </>
        }
      />
      <div className="max-w-3xl space-y-4 p-6">
        <Panel>
          <div className="px-4 py-3">
            <p className="text-[13px] text-ink">
              This application is registered in the platform but its workflow is not part of the
              current build.
            </p>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              Navigation, authorization and audit logging are already provided by the shell, so
              building it means adding the data model, the table and the actions — not a new
              security or audit architecture.
            </p>
          </div>
        </Panel>

        <Panel
          title="Authorization contract"
          description="Enforced server-side by the shared mutation path once the actions are implemented."
        >
          <table className="w-full border-collapse border-t border-line text-[13px]">
            <thead>
              <tr className="border-b border-line bg-canvas">
                <th
                  scope="col"
                  className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted"
                >
                  Action
                </th>
                {ROLES.map((entry) => (
                  <th
                    key={entry}
                    scope="col"
                    className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted"
                  >
                    {ROLE_LABELS[entry]}
                    {entry === role ? (
                      <span className="ml-1 font-normal normal-case text-accent">(you)</span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {app.writePermissions.map((permission) => (
                <tr key={permission} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-2">{PERMISSION_LABELS[permission]}</td>
                  {ROLES.map((entry) => (
                    <td key={entry} className="px-4 py-2">
                      {can(entry, permission) ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Check aria-hidden className="size-3.5" />
                          Allowed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-ink-subtle">
                          <Minus aria-hidden className="size-3.5" />
                          Denied
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
