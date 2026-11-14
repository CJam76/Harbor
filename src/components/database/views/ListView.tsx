import React from 'react';
import { Database, Page, DatabaseColumn } from '../../../types';
import { Calendar, CheckSquare, Maximize2, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../../context/WorkspaceContext';

interface ListViewProps {
  database: Database;
  rows: Page[];
  visibleColumns: DatabaseColumn[];
  onOpenRow: (rowId: string) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  database,
  rows,
  visibleColumns,
  onOpenRow,
}) => {
  const { updateDatabaseRow, deleteDatabaseRow } = useWorkspace();

  const statusCol = database.columns.find(c => c.type === 'status' || c.type === 'select');
  const dateCol = database.columns.find(c => c.type === 'date');
  const checkCol = database.columns.find(c => c.type === 'checkbox');

  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080d1a] shadow-sm select-none divide-y divide-slate-100 dark:divide-slate-800/80">
      {rows.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 italic">
          No records in this list.
        </div>
      ) : (
        rows.map(row => {
          const statusVal = statusCol ? row.properties?.[statusCol.id] : null;
          const statusOpt = statusCol?.options?.find(o => o.id === statusVal);
          const dateVal = dateCol ? row.properties?.[dateCol.id] : null;
          const checkVal = checkCol ? row.properties?.[checkCol.id] : null;

          return (
            <div
              key={row.id}
              onClick={() => onOpenRow(row.id)}
              className="flex items-center justify-between p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer transition-colors group/item"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {checkCol && (
                  <input
                    type="checkbox"
                    checked={Boolean(checkVal)}
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                      const updated = {
                        ...(row.properties || {}),
                        [checkCol.id]: e.target.checked,
                      };
                      updateDatabaseRow(row.id, updated);
                    }}
                    className="w-4 h-4 accent-[#0284c7] cursor-pointer flex-shrink-0"
                  />
                )}

                <span className={`font-medium truncate text-slate-900 dark:text-slate-100 ${checkVal ? 'line-through text-slate-400' : ''}`}>
                  {row.title}
                </span>

                {statusOpt && (
                  <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {statusOpt.label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-slate-400 flex-shrink-0">
                {dateVal && (
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{dateVal}</span>
                  </div>
                )}

                <button
                  onClick={e => {
                    e.stopPropagation();
                    deleteDatabaseRow(row.id);
                  }}
                  className="opacity-0 group-hover/item:opacity-100 p-1 hover:text-rose-600 transition-opacity"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={e => {
                    e.stopPropagation();
                    onOpenRow(row.id);
                  }}
                  className="p-1 hover:text-[#0284c7]"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
