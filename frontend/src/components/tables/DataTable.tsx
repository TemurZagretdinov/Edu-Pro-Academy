import type { ReactNode } from "react";

export type Column<T> = {
  header: ReactNode;
  cell: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  emptyLabel?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
};

export function DataTable<T>({ data, columns, emptyLabel = "No records yet.", onRowClick, className = "" }: DataTableProps<T>) {
  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column, index) => (
                <th key={index} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={columns.length}>
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={index}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? "cursor-pointer transition hover:bg-gray-100" : "hover:bg-slate-50"}
                >
                  {columns.map((column, columnIndex) => (
                    <td key={columnIndex} className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
