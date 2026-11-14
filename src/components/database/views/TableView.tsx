import React, { useState } from 'react';
import {
  Plus,
  ArrowUpDown,
  MoreHorizontal,
  ExternalLink,
  Calendar,
  Check,
  Maximize2,
  Trash2,
  ChevronDown,
  Calculator
} from 'lucide-react';
import { Database, Page, DatabaseColumn } from '../../../types';
import { useWorkspace } from '../../../context/WorkspaceContext';

interface TableViewProps {
  database: Database;
  rows: Page[];
  visibleColumns: DatabaseColumn[];
  onOpenRow: (rowId: string) => void;
  onAddColumn: () => void;
}

export const TableView: React.FC<TableViewProps> = ({
  database,
  rows,
  visibleColumns,
  onOpenRow,
  onAddColumn,
}) => {
  const { createDatabaseRow, updateDatabaseRow, deleteDatabaseRow } = useWorkspace();

  const handleCellChange = (row: Page, colId: string, value: any) => {
    const updatedProps = { ...(row.properties || {}), [colId]: value };
    const firstCol = database.columns[0];
    const newTitle = colId === firstCol?.id ? String(value) : row.title;
    updateDatabaseRow(row.id, updatedProps, newTitle);
  };

  const handleAddRow = async () => {
    await createDatabaseRow(database.id, 'New Record');
  };

  // Column Rollup / Calculation Summary State
  const [colCalcs, setColCalcs] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`harbor_table_calcs_${database.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [activeCalcMenuColId, setActiveCalcMenuColId] = useState<string | null>(null);

  const handleSetCalc = (colId: string, calcType: string) => {
    const next = { ...colCalcs, [colId]: calcType };
    if (calcType === 'none') {
      delete next[colId];
    }
    setColCalcs(next);
    localStorage.setItem(`harbor_table_calcs_${database.id}`, JSON.stringify(next));
    setActiveCalcMenuColId(null);
  };

  const computeColumnSummary = (col: DatabaseColumn, calcType?: string) => {
    if (!calcType || calcType === 'none') return null;

    const values = rows.map(r => {
      if (col.id === database.columns[0]?.id && r.properties?.[col.id] === undefined) {
        return r.title;
      }
      return r.properties?.[col.id];
    });

    switch (calcType) {
      case 'count_all':
        return `Count ${values.length}`;
      case 'count_values':
        return `Filled ${values.filter(v => v !== undefined && v !== null && v !== '').length}`;
      case 'unique': {
        const set = new Set(values.filter(v => v !== undefined && v !== null && v !== ''));
        return `Unique ${set.size}`;
      }
      case 'empty':
        return `Empty ${values.filter(v => v === undefined || v === null || v === '').length}`;
      case 'not_empty':
        return `Filled ${values.filter(v => v !== undefined && v !== null && v !== '').length}`;
      case 'sum': {
        const s = values.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
        return `Sum ${Number.isInteger(s) ? s : s.toFixed(2)}`;
      }
      case 'average': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        if (nums.length === 0) return 'Avg 0';
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        return `Avg ${Number.isInteger(avg) ? avg : avg.toFixed(2)}`;
      }
      case 'min': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        if (nums.length === 0) return 'Min 0';
        return `Min ${Math.min(...nums)}`;
      }
      case 'max': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        if (nums.length === 0) return 'Max 0';
        return `Max ${Math.max(...nums)}`;
      }
      case 'checked': {
        const c = values.filter(Boolean).length;
        return `Checked ${c}`;
      }
      case 'unchecked': {
        const c = values.filter(v => !v).length;
        return `Unchecked ${c}`;
      }
      case 'percent_checked': {
        if (values.length === 0) return '0%';
        const c = values.filter(Boolean).length;
        const pct = Math.round((c / values.length) * 100);
        return `${pct}% Checked`;
      }
      default:
        return null;
    }
  };

  return (
    <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080d1a] shadow-sm select-none">
      <table className="w-full border-collapse text-left text-xs">
        {/* Table Header */}
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
            <th className="w-10 px-3 py-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-[10px]">
              #
            </th>

            {visibleColumns.map(col => (
              <th
                key={col.id}
                style={{ width: col.width ? `${col.width}px` : 'auto' }}
                className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-medium tracking-tight whitespace-nowrap min-w-[120px]"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{col.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase ml-1 opacity-70">
                    {col.type}
                  </span>
                </div>
              </th>
            ))}

            {/* Add Column Header */}
            <th className="w-12 px-2 py-1 text-center font-normal">
              <button
                onClick={onAddColumn}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                title="Add Column"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={visibleColumns.length + 2}
                className="px-4 py-8 text-center text-slate-400 italic"
              >
                No records found. Click below to add the first record.
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr
                key={row.id}
                className="border-b border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 group/row transition-colors"
              >
                {/* Row Number & Open Button */}
                <td className="w-10 px-2 py-1 text-center border-r border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center justify-center">
                    <span className="group-hover/row:hidden">{rowIdx + 1}</span>
                    <button
                      onClick={() => onOpenRow(row.id)}
                      className="hidden group-hover/row:block p-0.5 text-[#0284c7] hover:bg-sky-50 dark:hover:bg-sky-950/40"
                      title="Open page"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>

                {/* Data Cells */}
                {visibleColumns.map((col, colIdx) => {
                  const val = row.properties?.[col.id];

                  return (
                    <td
                      key={col.id}
                      className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      {/* Text */}
                      {col.type === 'text' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={val ?? (colIdx === 0 ? row.title : '')}
                            onChange={e => handleCellChange(row, col.id, e.target.value)}
                            className="w-full bg-transparent border-none outline-none focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-[#0284c7] px-1 py-0.5 rounded-none text-xs"
                          />
                          {colIdx === 0 && (
                            <button
                              onClick={() => onOpenRow(row.id)}
                              className="opacity-0 group-hover/row:opacity-100 p-0.5 text-slate-400 hover:text-[#0284c7]"
                              title="Open row as page"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Number */}
                      {col.type === 'number' && (
                        <input
                          type="number"
                          value={val ?? ''}
                          onChange={e =>
                            handleCellChange(
                              row,
                              col.id,
                              e.target.value === '' ? '' : Number(e.target.value)
                            )
                          }
                          className="w-full bg-transparent border-none outline-none focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-[#0284c7] px-1 py-0.5 rounded-none text-xs font-mono"
                        />
                      )}

                      {/* Checkbox */}
                      {col.type === 'checkbox' && (
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={e => handleCellChange(row, col.id, e.target.checked)}
                            className="w-3.5 h-3.5 accent-[#0284c7] cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Select / Status */}
                      {(col.type === 'select' || col.type === 'status') && (
                        <select
                          value={val ?? ''}
                          onChange={e => handleCellChange(row, col.id, e.target.value)}
                          className="w-full bg-transparent border-none outline-none focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-[#0284c7] px-1 py-0.5 rounded-none text-xs cursor-pointer"
                        >
                          <option value="">-</option>
                          {col.options?.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Date */}
                      {col.type === 'date' && (
                        <input
                          type="date"
                          value={val ?? ''}
                          onChange={e => handleCellChange(row, col.id, e.target.value)}
                          className="w-full bg-transparent border-none outline-none focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-[#0284c7] px-1 py-0.5 rounded-none text-xs font-mono"
                        />
                      )}

                      {/* URL */}
                      {col.type === 'url' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="url"
                            value={val ?? ''}
                            onChange={e => handleCellChange(row, col.id, e.target.value)}
                            placeholder="https://"
                            className="w-full bg-transparent border-none outline-none focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-[#0284c7] px-1 py-0.5 rounded-none text-xs font-mono truncate"
                          />
                          {val && (
                            <a
                              href={val}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-[#0284c7]"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}

                {/* Delete row action */}
                <td className="w-12 px-2 py-1 text-center">
                  <button
                    onClick={() => deleteDatabaseRow(row.id)}
                    className="opacity-0 group-hover/row:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                    title="Delete row"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>

        {/* Table Footer: Column Summary Calculations */}
        <tfoot>
          <tr className="border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 text-[11px] font-mono">
            <td className="w-10 px-2 py-1.5 text-center border-r border-slate-200 dark:border-slate-800 text-[10px] text-slate-400">
              <Calculator className="w-3 h-3 mx-auto text-slate-400 opacity-60" />
            </td>

            {visibleColumns.map(col => {
              const calcType = colCalcs[col.id];
              const summaryText = computeColumnSummary(col, calcType);
              const isMenuOpen = activeCalcMenuColId === col.id;

              return (
                <td
                  key={col.id}
                  className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 relative group/calc"
                >
                  <div className="flex items-center justify-between">
                    {summaryText ? (
                      <button
                        type="button"
                        onClick={() => setActiveCalcMenuColId(isMenuOpen ? null : col.id)}
                        className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200 hover:text-[#0284c7] px-1 py-0.5 rounded-none"
                      >
                        <span>{summaryText}</span>
                        <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveCalcMenuColId(isMenuOpen ? null : col.id)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 opacity-0 group-hover/calc:opacity-100 transition-opacity text-[10px] uppercase font-sans tracking-wider px-1 py-0.5"
                      >
                        Calculate
                      </button>
                    )}
                  </div>

                  {/* Calculation Dropdown Menu */}
                  {isMenuOpen && (
                    <div
                      className="absolute left-0 bottom-full mb-1 z-30 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 shadow-glass py-1 w-36 text-xs font-sans text-slate-700 dark:text-slate-300"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleSetCalc(col.id, 'none')}
                        className="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 italic"
                      >
                        None
                      </button>
                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                      <button
                        type="button"
                        onClick={() => handleSetCalc(col.id, 'count_all')}
                        className="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                      >
                        <span>Count All</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetCalc(col.id, 'count_values')}
                        className="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                      >
                        <span>Count Filled</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetCalc(col.id, 'unique')}
                        className="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                      >
                        <span>Unique</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetCalc(col.id, 'empty')}
                        className="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                      >
                        <span>Empty</span>
                      </button>

                      {/* Number-specific calculations */}
                      {col.type === 'number' && (
                        <>
                          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                          <button
                            type="button"
                            onClick={() => handleSetCalc(col.id, 'sum')}
                            className="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-[#0284c7]"
                          >
                            Sum
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetCalc(col.id, 'average')}
                            className="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Average
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetCalc(col.id, 'min')}
                            className="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Min
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetCalc(col.id, 'max')}
                            className="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Max
                          </button>
                        </>
                      )}

                      {/* Checkbox-specific calculations */}
                      {col.type === 'checkbox' && (
                        <>
                          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                          <button
                            type="button"
                            onClick={() => handleSetCalc(col.id, 'checked')}
                            className="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-emerald-600"
                          >
                            Checked
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetCalc(col.id, 'unchecked')}
                            className="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Unchecked
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetCalc(col.id, 'percent_checked')}
                            className="w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-[#0284c7]"
                          >
                            % Checked
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              );
            })}

            {/* Empty footer cell for actions column */}
            <td className="w-12 px-2 py-1 text-center" />
          </tr>
        </tfoot>
      </table>

      {/* Add Row Button at Table Bottom */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <button
          onClick={handleAddRow}
          className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-none transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Record</span>
        </button>
      </div>
    </div>
  );
};
