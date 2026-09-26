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
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  empty?: ReactNode;
  ariaLabel: string;
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
          {rows.map((row) => (
            <tr
              key={getRowId(row)}
              className="border-b border-line last:border-b-0 hover:bg-canvas"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-3 py-2 align-middle",
                    column.align === "right" ? "text-right" : "text-left",
                    column.numeric && "tabular",
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
