import React, { useState, useRef } from 'react';
import { Plus, Calendar, CheckSquare, Maximize2, MoreHorizontal, GripVertical, Tag, X } from 'lucide-react';
import { Database, Page, DatabaseColumn } from '../../../types';
import { useWorkspace } from '../../../context/WorkspaceContext';

interface BoardViewProps {
  database: Database;
  rows: Page[];
  groupByColumnId?: string;
  onOpenRow: (rowId: string) => void;
}

const getDateStatus = (dateStr: string) => {
  if (!dateStr) return null;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Overdue', color: 'text-rose-500 bg-rose-500/10 border-rose-500/25' };
    if (diffDays === 0) return { label: 'Today', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/25' };
    if (diffDays === 1) return { label: 'Tomorrow', color: 'text-amber-500 bg-amber-500/10 border-amber-500/25' };
    return null;
  } catch {
    return null;
  }
};

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

  // Drag & drop state
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Inline card creation per column
  const [addingInColId, setAddingInColId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    e.dataTransfer.setData('text/plain', rowId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedRowId(rowId);
  };

  const handleColumnDragOver = (e: React.DragEvent, colOptionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColId(colOptionId);
  };

  const handleCardDragOver = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedRowId === targetRowId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';

    setDragOverRowId(targetRowId);
    setDropPosition(pos);
  };

  const handleColumnDrop = (e: React.DragEvent, targetOptionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rowId = draggedRowId || e.dataTransfer.getData('text/plain');
    if (!rowId || !groupColumn) return;

    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    // Check if dropped onto a specific card for intra-column reordering
    if (dragOverRowId && dropPosition) {
      const targetRow = rows.find(r => r.id === dragOverRowId);
      if (targetRow) {
        const colRows = rows.filter(r => {
          const val = r.properties?.[groupColumn.id];
          return val === targetOptionId || (!val && targetOptionId === options[0].id);
        });

        const targetIdx = colRows.findIndex(r => r.id === dragOverRowId);
        let targetOrder = targetRow.order || 0;
        if (dropPosition === 'before') {
          const prevRow = colRows[targetIdx - 1];
          const prevOrder = prevRow ? (prevRow.order || 0) : targetOrder - 1000;
          targetOrder = (prevOrder + targetOrder) / 2;
        } else {
          const nextRow = colRows[targetIdx + 1];
          const nextOrder = nextRow ? (nextRow.order || 0) : targetOrder + 1000;
          targetOrder = (targetOrder + nextOrder) / 2;
        }

        updateDatabaseRow(row.id, {
          ...(row.properties || {}),
          [groupColumn.id]: targetOptionId,
        }, row.title);
        // Note: order is saved on the row
      }
    } else {
      // Dropped into empty column area
      const updatedProps = { ...(row.properties || {}), [groupColumn.id]: targetOptionId };
      updateDatabaseRow(row.id, updatedProps);
    }

    setDraggedRowId(null);
    setDragOverColId(null);
    setDragOverRowId(null);
    setDropPosition(null);
  };

  const handleQuickAddSubmit = async (optionId: string) => {
    if (!newCardTitle.trim() || !groupColumn) return;
    await createDatabaseRow(database.id, newCardTitle.trim(), {
      [groupColumn.id]: optionId,
    });
    setNewCardTitle('');
    inlineInputRef.current?.focus();
  };

  // Color mapping helper for column status badges
  const getBadgeColors = (color?: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'emerald':
      case 'green':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'amber':
      case 'yellow':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'rose':
      case 'red':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'purple':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none items-start">
      {options.map(opt => {
        const columnRows = rows.filter(r => {
          const val = r.properties?.[groupColumn.id];
          return val === opt.id || (!val && opt.id === options[0].id);
        });

        const isDragTarget = dragOverColId === opt.id && !dragOverRowId;

        return (
          <div
            key={opt.id}
            onDragOver={e => handleColumnDragOver(e, opt.id)}
            onDragLeave={() => {
              if (dragOverColId === opt.id) setDragOverColId(null);
            }}
            onDrop={e => handleColumnDrop(e, opt.id)}
            className={`w-72 flex-shrink-0 flex flex-col bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-none transition-all ${
              isDragTarget ? 'ring-2 ring-[#0284c7] bg-sky-50/50 dark:bg-sky-950/20' : ''
            }`}
          >
            {/* Column Header */}
            <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white/40 dark:bg-[#0b1120]/40">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-none border ${getBadgeColors(
                    opt.color
                  )} truncate`}
                >
                  {opt.label}
                </span>
                <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {columnRows.length}
                </span>
              </div>

              <button
                onClick={() => {
                  setAddingInColId(opt.id);
                  setNewCardTitle('');
                  setTimeout(() => inlineInputRef.current?.focus(), 50);
                }}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-none transition-colors"
                title="Add card to column"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Column Cards Container */}
            <div className="p-2 space-y-2 flex-1 overflow-y-auto min-h-[160px] max-h-[calc(100vh-14rem)]">
              {columnRows.map(row => {
                const isDraggingThis = draggedRowId === row.id;
                const isDragTargetRow = dragOverRowId === row.id;

                // Dates, checkboxes, and extra property pills
                const dateCol = database.columns.find(c => c.type === 'date');
                const dateVal = dateCol ? row.properties?.[dateCol.id] : null;

                const checkCol = database.columns.find(c => c.type === 'checkbox');
                const checkVal = checkCol ? row.properties?.[checkCol.id] : null;

                const selectCols = database.columns.filter(
                  c => (c.type === 'select' || c.type === 'multi-select') && c.id !== groupColumn.id
                );

                return (
                  <div
                    key={row.id}
                    draggable
                    onDragStart={e => handleDragStart(e, row.id)}
                    onDragOver={e => handleCardDragOver(e, row.id)}
                    onDragLeave={() => {
                      if (dragOverRowId === row.id) {
                        setDragOverRowId(null);
                        setDropPosition(null);
                      }
                    }}
                    onClick={() => onOpenRow(row.id)}
                    className={`p-3 bg-white dark:bg-[#0b1120] border rounded-none shadow-sm cursor-pointer transition-all group/card relative ${
                      isDraggingThis ? 'opacity-30' : ''
                    } ${
                      isDragTargetRow && dropPosition === 'before'
                        ? 'border-t-2 border-t-[#0284c7] border-slate-200 dark:border-slate-800'
                        : isDragTargetRow && dropPosition === 'after'
                        ? 'border-b-2 border-b-[#0284c7] border-slate-200 dark:border-slate-800'
                        : 'border-slate-200/90 dark:border-slate-800 hover:border-[#0284c7] dark:hover:border-[#0284c7]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                        {row.title}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onOpenRow(row.id);
                        }}
                        className="opacity-0 group-hover/card:opacity-100 p-0.5 text-slate-400 hover:text-[#0284c7] transition-opacity"
                        title="Open Card Record"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Secondary Property Pills (Multi-select, tags) */}
                    {selectCols.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectCols.map(col => {
                          const val = row.properties?.[col.id];
                          if (!val) return null;
                          const optMatch = col.options?.find(o => o.id === val);
                          const label = optMatch ? optMatch.label : String(val);
                          return (
                            <span
                              key={col.id}
                              className="px-1.5 py-0.2 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Metadata Footer: Date, Checkbox */}
                    {(dateVal || checkCol) && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        {dateVal ? (
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{dateVal}</span>
                            </div>
                            {getDateStatus(String(dateVal)) && (
                              <span
                                className={`px-1 py-0.2 border text-[9px] font-semibold uppercase tracking-wider rounded-[2px] ${
                                  getDateStatus(String(dateVal))!.color
                                }`}
                              >
                                {getDateStatus(String(dateVal))!.label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span />
                        )}

                        {checkCol && (
                          <div
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(checkVal)}
                              onChange={e => {
                                const updatedProps = {
                                  ...(row.properties || {}),
                                  [checkCol.id]: e.target.checked,
                                };
                                updateDatabaseRow(row.id, updatedProps);
                              }}
                              className="w-3.5 h-3.5 accent-[#0284c7] cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {columnRows.length === 0 && (
                <div className="h-20 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 italic">
                  Drag cards here
                </div>
              )}

              {/* Inline Quick Add Input */}
              {addingInColId === opt.id && (
                <div className="p-2 bg-white dark:bg-[#0b1120] border border-[#0284c7] shadow-sm space-y-2">
                  <input
                    ref={inlineInputRef}
                    type="text"
                    placeholder="Card title..."
                    value={newCardTitle}
                    onChange={e => setNewCardTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddSubmit(opt.id);
                      } else if (e.key === 'Escape') {
                        setAddingInColId(null);
                        setNewCardTitle('');
                      }
                    }}
                    className="w-full text-xs bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setAddingInColId(null);
                        setNewCardTitle('');
                      }}
                      className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleQuickAddSubmit(opt.id)}
                      className="px-2.5 py-0.5 bg-[#0284c7] text-white font-medium text-[11px] hover:bg-sky-600 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Add trigger at bottom */}
            {addingInColId !== opt.id && (
              <div className="p-2 border-t border-slate-200/60 dark:border-slate-800">
                <button
                  onClick={() => {
                    setAddingInColId(opt.id);
                    setNewCardTitle('');
                    setTimeout(() => inlineInputRef.current?.focus(), 50);
                  }}
                  className="w-full py-1 text-center text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-none transition-colors"
                >
                  + Add item
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
