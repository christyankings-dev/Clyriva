import type { ReactNode } from 'react';

interface DataTableProps {
  columns: string[];
  children?: ReactNode;
}

export function DataTable({ columns, children }: DataTableProps) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
