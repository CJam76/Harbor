import React, { useState } from 'react';
import { Plus, Calendar, CheckSquare, Maximize2, MoreHorizontal } from 'lucide-react';
import { Database, Page, DatabaseColumn } from '../../../types';
import { useWorkspace } from '../../../context/WorkspaceContext';

interface BoardViewProps {
  database: Database;
  rows: Page[];
  groupByColumnId?: string;
  onOpenRow: (rowId: string) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  database,
  rows,
  groupByColumnId,
  onOpenRow,
}) => {
  const { createDatabaseRow, updateDatabaseRow } = useWorkspace();

  // Find column to group by (default to first status or select column)
  const groupColumn =
    database.columns.find(c => c.id === groupByColumnId) ||
    database.columns.find(c => c.type === 'status' || c.type === 'select') ||
    database.columns[0];

  const options = groupColumn?.options || [
    { id: 'opt-default', label: 'Items', color: 'slate' }
  ];

  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    e.dataTransfer.setData('text/plain', rowId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedRowId(rowId);
  };

  const handleDragOver = (e: React.DragEvent, colOptionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColId(colOptionId);
  };

  const handleDrop = (e: React.DragEvent, targetOptionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rowId = draggedRowId || e.dataTransfer.getData('text/plain');
    if (!rowId || !groupColumn) return;

    const row = rows.find(r => r.id === rowId);
    if (row) {
      const updatedProps = { ...(row.properties || {}), [groupColumn.id]: targetOptionId };
      updateDatabaseRow(row.id, updatedProps);
    }
    setDraggedRowId(null);
    setDragOverColId(null);
  };

  const handleAddCard = async (optionId: string) => {
    if (!groupColumn) return;
    await createDatabaseRow(database.id, 'New Card', {
      [groupColumn.id]: optionId,
    });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 select-none">
      {options.map(opt => {
        const columnRows = rows.filter(r => {
          const val = r.properties?.[groupColumn.id];
          return val === opt.id || (!val && opt.id === options[0].id);
        });

        const isDragTarget = dragOverColId === opt.id;

        return (
          <div
            key={opt.id}
            onDragOver={e => handleDragOver(e, opt.id)}
            onDragLeave={() => setDragOverColId(null)}
            onDrop={e => handleDrop(e, opt.id)}
            className={`w-72 flex-shrink-0 flex flex-col bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-none transition-colors ${
              isDragTarget ? 'ring-2 ring-[#0284c7] bg-sky-50/50 dark:bg-sky-950/20' : ''
            }`}
          >
            {/* Column Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  {opt.label}
                </span>
                <span className="text-[11px] font-mono text-slate-400 px-1.5 py-0.2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {columnRows.length}
                </span>
              </div>

              <button
                onClick={() => handleAddCard(opt.id)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-none"
                title="Add card"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Column Cards */}
            <div className="p-2 space-y-2 flex-1 overflow-y-auto min-h-[300px]">
              {columnRows.map(row => {
                // Find date or priority column if available
                const dateCol = database.columns.find(c => c.type === 'date');
                const dateVal = dateCol ? row.properties?.[dateCol.id] : null;

                const checkCol = database.columns.find(c => c.type === 'checkbox');
                const checkVal = checkCol ? row.properties?.[checkCol.id] : null;

                const isDraggingThis = draggedRowId === row.id;

                return (
                  <div
                    key={row.id}
                    draggable
                    onDragStart={e => handleDragStart(e, row.id)}
                    onClick={() => onOpenRow(row.id)}
                    className={`p-3 bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-slate-800 rounded-none shadow-paper cursor-pointer hover:border-[#0284c7] transition-all group/card ${
                      isDraggingThis ? 'opacity-40' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                        {row.title}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onOpenRow(row.id);
                        }}
                        className="opacity-0 group-hover/card:opacity-100 p-0.5 text-slate-400 hover:text-[#0284c7]"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Metadata Footer: Date, Checkbox, etc */}
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      {dateVal ? (
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <Calendar className="w-3 h-3" />
                          <span>{dateVal}</span>
                        </div>
                      ) : (
                        <span />
                      )}

                      {checkCol && (
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={Boolean(checkVal)}
                            onChange={e => {
                              e.stopPropagation();
                              const updatedProps = {
                                ...(row.properties || {}),
                                [checkCol.id]: e.target.checked,
                              };
                              updateDatabaseRow(row.id, updatedProps);
                            }}
                            className="w-3.5 h-3.5 accent-[#0284c7]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {columnRows.length === 0 && (
                <div className="h-20 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 italic">
                  Drag cards here
                </div>
              )}
            </div>

            {/* Quick Add at bottom */}
            <div className="p-2 border-t border-slate-200/60 dark:border-slate-800">
              <button
                onClick={() => handleAddCard(opt.id)}
                className="w-full py-1 text-center text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-none transition-colors"
              >
                + Add item
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
