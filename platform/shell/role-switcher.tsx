"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { useTransition } from "react";
import { setRole } from "@/app/actions";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "../rbac";
import type { SimulatedUser } from "../session";

export function RoleSwitcher({ user }: { user: SimulatedUser }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "flex items-center gap-2 rounded-[3px] border border-line-strong bg-surface py-1 pl-1 pr-2 text-left hover:bg-canvas",
          pending && "opacity-60",
        )}
        aria-label={`Simulated user ${user.name}, role ${ROLE_LABELS[user.role]}. Change role`}
      >
        <span className="flex size-6 items-center justify-center rounded-[2px] bg-accent text-[11px] font-semibold text-white">
          {user.initials}
        </span>
        <span className="leading-tight">
          <span className="block text-[12.5px] font-medium text-ink">{user.name}</span>
          <span className="block text-[11px] text-ink-muted">{ROLE_LABELS[user.role]}</span>
        </span>
        <ChevronDown aria-hidden className="size-3.5 text-ink-subtle" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="w-72 rounded-[4px] border border-line bg-surface p-1 shadow-lg"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">
            Simulate role
          </DropdownMenu.Label>
          {ROLES.map((role: Role) => (
            <DropdownMenu.Item
              key={role}
              onSelect={() => startTransition(() => setRole(role))}
              className="flex cursor-pointer items-start gap-2 rounded-[3px] px-2 py-1.5 text-[13px] outline-none data-[highlighted]:bg-canvas"
            >
              <Check
                aria-hidden
                className={cn(
                  "mt-0.5 size-3.5 shrink-0",
                  role === user.role ? "text-accent" : "invisible",
                )}
              />
              <span>
                <span className="block font-medium text-ink">{ROLE_LABELS[role]}</span>
                <span className="block text-[12px] text-ink-muted">{ROLE_DESCRIPTIONS[role]}</span>
              </span>
            </DropdownMenu.Item>
          ))}
          <p className="border-t border-line px-2 py-1.5 text-[11.5px] text-ink-subtle">
            Demo control. Authorization is enforced server-side on every mutation.
          </p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
