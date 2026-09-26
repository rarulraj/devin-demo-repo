import { getSession } from "@/platform/session";
import { Breadcrumb } from "@/platform/shell/breadcrumb";
import { RoleSwitcher } from "@/platform/shell/role-switcher";
import { SidebarNav } from "@/platform/shell/sidebar-nav";

export default async function ShellLayout({ children }: LayoutProps<"/">) {
  const user = await getSession();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-[228px] shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex h-12 items-center gap-2 border-b border-line px-4">
          <span
            aria-hidden
            className="flex size-6 items-center justify-center rounded-[3px] bg-ink text-[11px] font-bold text-white"
          >
            NL
          </span>
          <span className="leading-tight">
            <span className="block text-[13px] font-semibold tracking-[-0.01em] text-ink">
              Fintech Operations
            </span>
            <span className="block text-[11px] text-ink-subtle">Northlane Financial</span>
          </span>
        </div>
        <SidebarNav />
        <div className="mt-auto border-t border-line px-4 py-3">
          <p className="text-[11px] text-ink-subtle">
            Internal Tools Platform · v0.1
            <br />
            Sandbox data
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-6">
          <Breadcrumb />
          <div className="flex items-center gap-3">
            <span className="rounded-[3px] border border-line-strong bg-canvas px-1.5 py-0.5 text-[11px] font-medium text-ink-muted">
              Sandbox
            </span>
            <RoleSwitcher user={user} />
          </div>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
