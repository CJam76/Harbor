import React, { useState } from 'react';
import { Database, Page } from '../../../types';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon } from 'lucide-react';
import { useWorkspace } from '../../../context/WorkspaceContext';

interface CalendarViewProps {
  database: Database;
  rows: Page[];
  onOpenRow: (rowId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  database,
  rows,
  onOpenRow,
}) => {
  const { createDatabaseRow } = useWorkspace();
  const dateCol = database.columns.find(c => c.type === 'date');

  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Map rows by YYYY-MM-DD
  const rowsByDate: Record<string, Page[]> = {};
  if (dateCol) {
    for (const r of rows) {
      const d = r.properties?.[dateCol.id];
      if (d) {
        if (!rowsByDate[d]) rowsByDate[d] = [];
        rowsByDate[d].push(r);
      }
    }
  }

  const handleDayClick = async (day: number) => {
    if (!dateCol) return;
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    await createDatabaseRow(database.id, 'New Event', {
      [dateCol.id]: formatted,
    });
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080d1a] shadow-sm select-none">
      {/* Month Navigation Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-xs text-slate-800 dark:text-slate-200">
          <CalIcon className="w-4 h-4 text-[#0284c7]" />
          <span>{monthNames[month]} {year}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none text-slate-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-none text-slate-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day of Week Labels */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-1.5">
        {daysOfWeek.map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar Grid Cells */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
        {/* Leading empty cells */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[90px] bg-slate-50/30 dark:bg-slate-900/20 p-1" />
        ))}

        {/* Days of month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayRows = rowsByDate[dateStr] || [];
          const isToday =
            new Date().toDateString() === new Date(year, month, day).toDateString();

          return (
            <div
              key={day}
              onClick={() => handleDayClick(day)}
              className={`min-h-[90px] p-1.5 flex flex-col justify-between hover:bg-slate-50/70 dark:hover:bg-slate-900/40 cursor-pointer transition-colors group/day ${
                isToday ? 'bg-sky-50/30 dark:bg-sky-950/20' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-mono font-medium px-1 rounded-none ${
                    isToday ? 'bg-[#0284c7] text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {day}
                </span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleDayClick(day);
                  }}
                  className="opacity-0 group-day:opacity-100 p-0.5 text-slate-400 hover:text-[#0284c7]"
                  title="Add record on this day"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Day items */}
              <div className="space-y-1 my-1">
                {dayRows.map(row => (
                  <div
                    key={row.id}
                    onClick={e => {
                      e.stopPropagation();
                      onOpenRow(row.id);
                    }}
                    className="p-1 text-[11px] font-medium bg-[#0284c7]/10 dark:bg-[#0284c7]/20 text-[#0284c7] dark:text-[#38bdf8] border-l-2 border-l-[#0284c7] truncate hover:underline"
                    title={row.title}
                  >
                    {row.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
