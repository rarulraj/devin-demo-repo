import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Tailwind width class, e.g. "w-[160px]". */
  width?: string;
  align?: "left" | "right";
  /** Numeric columns render tabular figures. */
  numeric?: boolean;
  headerSrOnly?: boolean;
};

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  empty,
  ariaLabel,
  rowHref,
  selectedRowId,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  empty?: ReactNode;
  ariaLabel: string;
  /** Makes rows navigable; the first cell carries the accessible link. */
  rowHref?: (row: T) => string;
  selectedRowId?: string;
}) {
  if (rows.length === 0 && empty) {
    return <div className="border-t border-line">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]" aria-label={ariaLabel}>
        <thead>
          <tr className="border-y border-line bg-canvas">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted",
                  column.align === "right" ? "text-right" : "text-left",
                  column.width,
                )}
              >
                <span className={cn(column.headerSrOnly && "sr-only")}>{column.header}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = getRowId(row);
            const href = rowHref?.(row);
            return (
              <tr
                key={id}
                aria-current={selectedRowId === id ? "true" : undefined}
                className={cn(
                  "border-b border-line last:border-b-0",
                  selectedRowId === id ? "bg-accent-soft" : "hover:bg-canvas",
                )}
              >
                {columns.map((column, index) => {
                  const content = column.cell(row);
                  return (
                    <td
                      key={column.key}
                      className={cn(
                        "align-middle",
                        href ? "p-0" : "px-3 py-2",
                        column.align === "right" ? "text-right" : "text-left",
                        column.numeric && "tabular",
                      )}
                    >
                      {href ? (
                        <Link
                          href={href}
                          scroll={false}
                          tabIndex={index === 0 ? undefined : -1}
                          aria-hidden={index === 0 ? undefined : true}
                          className="block px-3 py-2"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
