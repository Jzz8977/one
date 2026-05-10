import type { ReactNode } from 'react';
import { cn } from '../utils.js';

export interface Column<T> {
  key: string;
  title: ReactNode;
  render?: (row: T) => ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  loading?: boolean;
}

export function Table<T>({ columns, data, rowKey, empty, loading }: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width }}
                className={cn('px-4 py-3 font-medium', alignClass(c.align))}
              >
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">
                加载中...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                {empty ?? '暂无数据'}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-slate-50">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 text-slate-700', alignClass(c.align))}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function alignClass(a?: 'left' | 'center' | 'right') {
  if (a === 'center') return 'text-center';
  if (a === 'right') return 'text-right';
  return 'text-left';
}
